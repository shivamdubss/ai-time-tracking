"""Offline-first sync engine: local SQLite <-> Supabase Postgres."""

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Optional

from .database import INTERNAL_CLIENT_ID, INTERNAL_MATTERS

logger = logging.getLogger("timetrack")

# Generic IDs used by desktop seeding (before user login)
_GENERIC_INTERNAL_IDS = {INTERNAL_CLIENT_ID} | {m["id"] for m in INTERNAL_MATTERS}

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

    def set_access_token(self, access_token: str):
        """Set the user's Supabase access token for authenticated sync."""
        self._supabase.options.headers["Authorization"] = f"Bearer {access_token}"

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

    def _remap_internal_ids(self):
        """One-time migration: rename generic desktop IDs to user-scoped IDs.

        Desktop seeds matters as 'nb-admin', Supabase seeds as 'nb-admin-{userId}'.
        This renames the local rows so sync doesn't create duplicates.
        """
        conn = self._get_db()
        row = conn.execute(
            "SELECT id FROM clients WHERE id = ?", (INTERNAL_CLIENT_ID,)
        ).fetchone()
        if not row:
            conn.close()
            return  # Already remapped or web-only user

        uid = self._user_id
        now = datetime.now(timezone.utc).isoformat()

        # Remap internal client ID
        new_client_id = f"{INTERNAL_CLIENT_ID}-{uid}"
        conn.execute(
            "UPDATE clients SET id = ?, updated_at = ?, synced_at = NULL WHERE id = ?",
            (new_client_id, now, INTERNAL_CLIENT_ID),
        )
        conn.execute(
            "UPDATE matters SET client_id = ?, updated_at = ? WHERE client_id = ?",
            (new_client_id, now, INTERNAL_CLIENT_ID),
        )

        # Remap each internal matter ID and update FK references
        for m in INTERNAL_MATTERS:
            old_id = m["id"]
            new_id = f"{old_id}-{uid}"
            conn.execute(
                "UPDATE matters SET id = ?, synced_at = NULL WHERE id = ?",
                (new_id, old_id),
            )
            conn.execute(
                "UPDATE activities SET matter_id = ? WHERE matter_id = ?",
                (new_id, old_id),
            )
            conn.execute(
                "UPDATE sessions SET matter_id = ? WHERE matter_id = ?",
                (new_id, old_id),
            )

        conn.commit()
        conn.close()

        # Clean up stale generic-ID rows from Supabase (if previously pushed)
        for old_id in [INTERNAL_CLIENT_ID] + [m["id"] for m in INTERNAL_MATTERS]:
            table = "clients" if old_id == INTERNAL_CLIENT_ID else "matters"
            try:
                self._supabase.table(table).delete().eq(
                    "id", old_id
                ).eq("user_id", uid).execute()
            except Exception:
                pass  # Row may not exist remotely — that's fine

        logger.info("Remapped internal IDs to user-scoped format")

    def _sync_all(self):
        if not self._user_id or not self._supabase:
            return

        self._remap_internal_ids()

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

        timestamp_cols = {"start_time", "end_time", "created_at", "updated_at"}

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
                # Normalize naive timestamps: treat as local time, convert to UTC
                if col in timestamp_cols and isinstance(val, str) and val:
                    if not val.endswith("Z") and "+" not in val[10:] and "-" not in val[19:]:
                        try:
                            naive_dt = datetime.fromisoformat(val)
                            if naive_dt.tzinfo is None:
                                utc_dt = naive_dt.astimezone(timezone.utc)
                                val = utc_dt.isoformat()
                        except (ValueError, TypeError):
                            pass
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

        query = self._supabase.table(table).select("*")

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

            values["user_id"] = record.get("user_id")
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
