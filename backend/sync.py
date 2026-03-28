"""Offline-first sync engine: local SQLite <-> Supabase Postgres."""

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("timetrack")

SYNC_INTERVAL = int(os.getenv("TIMETRACK_SYNC_INTERVAL", "60"))  # 1 min default

# Tables to sync and their column lists (excluding local-only columns)
SYNC_TABLES = {
    "clients": [
        "id", "name", "contact_info", "billing_address", "default_rate",
        "notes", "is_internal", "created_at", "updated_at",
    ],
    "matters": [
        "id", "client_id", "name", "matter_number", "status",
        "practice_area", "billing_type", "hourly_rate", "keywords",
        "key_people", "team_members", "notes", "created_at", "updated_at",
    ],
    "sessions": [
        "id", "start_time", "end_time", "status", "summary",
        "categories", "activities", "matter_id", "created_at", "updated_at",
    ],
    "activities": [
        "id", "session_id", "matter_id", "app", "context", "minutes",
        "narrative", "category", "billable", "effective_rate", "activity_code",
        "sort_order", "start_time", "end_time", "approval_status",
        "created_at", "updated_at",
    ],
}

# JSON columns that need serialization/deserialization
JSON_COLUMNS = {"keywords", "key_people", "team_members", "categories", "activities"}


class SyncEngine:
    """Background sync engine that pushes/pulls data between local SQLite and Supabase."""

    def __init__(self, supabase_client, get_db_func):
        self._supabase = supabase_client
        self._get_db = get_db_func
        self._user_id: Optional[str] = None
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_pull: dict[str, str] = {}  # table -> last pull timestamp

    def set_user(self, user_id: str):
        self._user_id = user_id

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("SyncEngine started")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=10)
        logger.info("SyncEngine stopped")

    def _run_loop(self):
        # Initial sync on start
        self._sync_all()

        while not self._stop_event.is_set():
            self._stop_event.wait(SYNC_INTERVAL)
            if not self._stop_event.is_set():
                self._sync_all()

    def sync_now(self):
        """Trigger an immediate sync (called after session stop, etc.)."""
        threading.Thread(target=self._sync_all, daemon=True).start()

    def _sync_all(self):
        if not self._user_id or not self._supabase:
            return

        for table in SYNC_TABLES:
            try:
                self._push(table)
            except Exception as e:
                logger.warning(f"Sync push failed for {table}: {e}")

            try:
                self._pull(table)
            except Exception as e:
                logger.warning(f"Sync pull failed for {table}: {e}")

    def _push(self, table: str):
        """Push local changes to Supabase."""
        conn = self._get_db()
        columns = SYNC_TABLES[table]

        # Find rows where updated_at > synced_at (or synced_at is NULL)
        rows = conn.execute(
            f"SELECT {', '.join(columns)}, synced_at FROM {table} "
            f"WHERE synced_at IS NULL OR updated_at > synced_at"
        ).fetchall()

        if not rows:
            conn.close()
            return

        for row in rows:
            record = {}
            for col in columns:
                val = row[col]
                # Serialize JSON columns
                if col in JSON_COLUMNS and isinstance(val, str):
                    try:
                        val = json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        pass
                # Convert SQLite boolean integers to actual booleans
                if col in ("is_internal", "billable") and val is not None:
                    val = bool(val)
                record[col] = val

            record["user_id"] = self._user_id

            try:
                self._supabase.table(table).upsert(record).execute()

                # Mark as synced locally
                now = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    f"UPDATE {table} SET synced_at = ? WHERE id = ?",
                    (now, row["id"])
                )
            except Exception as e:
                logger.warning(f"Push failed for {table}/{row['id']}: {e}")

        conn.commit()
        conn.close()
        logger.debug(f"Pushed {len(rows)} rows to {table}")

    def _pull(self, table: str):
        """Pull remote changes from Supabase."""
        columns = SYNC_TABLES[table]
        last_pull = self._last_pull.get(table)

        query = self._supabase.table(table).select("*").eq("user_id", self._user_id)

        if last_pull:
            query = query.gt("updated_at", last_pull)

        result = query.execute()

        if not result.data:
            return

        conn = self._get_db()
        now = datetime.now(timezone.utc).isoformat()

        for record in result.data:
            # Check if local row is newer (last-write-wins)
            local = conn.execute(
                f"SELECT updated_at FROM {table} WHERE id = ?",
                (record["id"],)
            ).fetchone()

            if local and local["updated_at"] and record.get("updated_at"):
                local_ts = local["updated_at"]
                remote_ts = record["updated_at"]
                if local_ts > remote_ts:
                    continue  # Local is newer, skip

            # Build upsert values
            values = {}
            for col in columns:
                val = record.get(col)
                # Serialize JSON columns back to strings for SQLite
                if col in JSON_COLUMNS and not isinstance(val, str):
                    val = json.dumps(val) if val is not None else "[]"
                # Convert booleans back to integers for SQLite
                if col in ("is_internal", "billable") and isinstance(val, bool):
                    val = int(val)
                values[col] = val

            values["user_id"] = self._user_id
            values["synced_at"] = now

            placeholders = ", ".join(["?"] * len(values))
            col_names = ", ".join(values.keys())
            update_clause = ", ".join(
                f"{k} = excluded.{k}" for k in values.keys() if k != "id"
            )

            conn.execute(
                f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) "
                f"ON CONFLICT(id) DO UPDATE SET {update_clause}",
                list(values.values())
            )

        conn.commit()
        conn.close()

        # Update pull timestamp
        self._last_pull[table] = now
        logger.debug(f"Pulled {len(result.data)} rows from {table}")
