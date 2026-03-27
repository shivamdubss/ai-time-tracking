import sqlite3
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger("timetrack")

_db_dir_env = os.getenv("TIMETRACK_DB_DIR", "")
DB_DIR = Path(_db_dir_env).expanduser() if _db_dir_env else Path.home() / "Library" / "Application Support" / "TimeTrack"
DB_PATH = DB_DIR / "timetrack.db"

# Old developer category -> new legal category mapping
CATEGORY_MIGRATION_MAP = {
    "Coding": "Administrative",
    "Communication": "Client Communication",
    "Research": "Legal Research",
    "Meetings": "Court & Hearings",
    "Browsing": "Case Review",
}


def get_db() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()

    # Sessions table (original)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            start_time TEXT NOT NULL,
            end_time TEXT,
            status TEXT DEFAULT 'tracking',
            summary TEXT,
            categories TEXT DEFAULT '[]',
            activities TEXT DEFAULT '[]',
            matter_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Clients table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_info TEXT,
            billing_address TEXT,
            default_rate REAL,
            notes TEXT,
            is_internal INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Matters table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS matters (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            name TEXT NOT NULL,
            matter_number TEXT,
            status TEXT DEFAULT 'active',
            practice_area TEXT,
            billing_type TEXT DEFAULT 'hourly',
            hourly_rate REAL,
            keywords TEXT DEFAULT '[]',
            key_people TEXT DEFAULT '[]',
            team_members TEXT DEFAULT '[]',
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_matters_client_id ON matters(client_id)")

    # Activities table (normalized from session JSON)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            matter_id TEXT,
            app TEXT NOT NULL,
            context TEXT,
            minutes INTEGER,
            narrative TEXT,
            category TEXT,
            billable INTEGER DEFAULT 1,
            effective_rate REAL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_session_id ON activities(session_id)")

    # Add matter_id column to sessions if missing (migration for existing DBs)
    try:
        conn.execute("SELECT matter_id FROM sessions LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE sessions ADD COLUMN matter_id TEXT")

    # Add is_internal column to clients if missing (migration for existing DBs)
    try:
        conn.execute("SELECT is_internal FROM clients LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE clients ADD COLUMN is_internal INTEGER DEFAULT 0")

    # Add start_time/end_time columns to activities if missing
    for col in ("start_time", "end_time"):
        try:
            conn.execute(f"SELECT {col} FROM activities LIMIT 1")
        except sqlite3.OperationalError:
            conn.execute(f"ALTER TABLE activities ADD COLUMN {col} TEXT")

    # Add approval_status column to activities if missing
    try:
        conn.execute("SELECT approval_status FROM activities LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE activities ADD COLUMN approval_status TEXT DEFAULT 'pending'")

    # Add activity_code column to activities if missing
    try:
        conn.execute("SELECT activity_code FROM activities LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE activities ADD COLUMN activity_code TEXT")

    conn.commit()

    # Migrate existing activities from JSON to activities table
    _migrate_activities(conn)

    # Seed the built-in internal client and non-billable matters
    _seed_internal_client()

    conn.close()


INTERNAL_CLIENT_ID = "internal"
INTERNAL_MATTERS = [
    {
        "id": "nb-admin",
        "name": "Administrative",
        "keywords": ["calendar", "outlook calendar", "timekeeping", "billing", "expense", "invoice"],
    },
    {
        "id": "nb-cle",
        "name": "CLE/Training",
        "keywords": ["cle", "training", "seminar", "webinar", "continuing legal education"],
    },
    {
        "id": "nb-bizdev",
        "name": "Business Development",
        "keywords": ["business development", "marketing", "proposal", "pitch", "networking", "linkedin"],
    },
    {
        "id": "nb-probono",
        "name": "Pro Bono",
        "keywords": ["pro bono", "legal aid", "volunteer"],
    },
]


def _seed_internal_client():
    """Create the built-in Firm / Internal client and non-billable matters if they don't exist."""
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        """INSERT OR IGNORE INTO clients (id, name, is_internal, created_at, updated_at)
           VALUES (?, ?, 1, ?, ?)""",
        (INTERNAL_CLIENT_ID, "Firm / Internal", now, now),
    )
    for m in INTERNAL_MATTERS:
        conn.execute(
            """INSERT OR IGNORE INTO matters (id, client_id, name, billing_type, keywords, created_at, updated_at)
               VALUES (?, ?, ?, 'non-billable', ?, ?, ?)""",
            (m["id"], INTERNAL_CLIENT_ID, m["name"], json.dumps(m["keywords"]), now, now),
        )
    conn.commit()
    conn.close()


def _migrate_activities(conn: sqlite3.Connection):
    """Migrate activities from session JSON blobs to the activities table."""
    rows = conn.execute(
        "SELECT id, activities, categories FROM sessions WHERE activities != '[]' AND activities IS NOT NULL"
    ).fetchall()

    for row in rows:
        session_id = row["id"]

        # Check if already migrated (idempotency)
        existing = conn.execute(
            "SELECT COUNT(*) as cnt FROM activities WHERE session_id = ?", (session_id,)
        ).fetchone()
        if existing["cnt"] > 0:
            continue

        try:
            activities_json = json.loads(row["activities"] or "[]")
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Skipping migration for session {session_id}: malformed JSON")
            continue

        for i, act in enumerate(activities_json):
            if not isinstance(act, dict):
                continue
            old_category = act.get("category", "")
            category = CATEGORY_MIGRATION_MAP.get(old_category, old_category)

            conn.execute(
                """INSERT INTO activities (id, session_id, app, context, minutes, narrative, category, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4())[:8],
                    session_id,
                    act.get("app", "Unknown"),
                    act.get("context", ""),
                    act.get("minutes", 0),
                    act.get("narrative", ""),
                    category,
                    i,
                ),
            )

    conn.commit()


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def prune_old_sessions():
    """Delete sessions older than 90 days."""
    cutoff = (datetime.now() - timedelta(days=90)).isoformat()
    conn = get_db()
    # Delete activities for those sessions first
    conn.execute(
        "DELETE FROM activities WHERE session_id IN (SELECT id FROM sessions WHERE start_time < ?)",
        (cutoff,),
    )
    conn.execute("DELETE FROM sessions WHERE start_time < ?", (cutoff,))
    conn.commit()
    conn.close()


def create_session(session_id: str, start_time: str) -> dict:
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (id, start_time, status) VALUES (?, ?, 'tracking')",
        (session_id, start_time),
    )
    conn.commit()
    conn.close()
    return {"id": session_id, "start_time": start_time, "status": "tracking"}


def update_session(session_id: str, **kwargs):
    conn = get_db()
    sets = []
    values = []
    for key, val in kwargs.items():
        sets.append(f"{key} = ?")
        if key in ("categories", "activities"):
            values.append(json.dumps([v.model_dump() if hasattr(v, "model_dump") else v for v in val]))
        else:
            values.append(val)
    values.append(session_id)
    conn.execute(f"UPDATE sessions SET {', '.join(sets)} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_session(session_id: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return _session_row_to_dict(row)


def get_sessions_by_date(date_str: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM sessions WHERE start_time LIKE ? ORDER BY start_time DESC",
        (f"{date_str}%",),
    ).fetchall()

    sessions = []
    for r in rows:
        s = _session_row_to_dict(r)
        # Load normalized activities
        act_rows = conn.execute(
            "SELECT * FROM activities WHERE session_id = ? ORDER BY sort_order",
            (r["id"],),
        ).fetchall()
        if act_rows:
            s["activities"] = [_activity_row_to_dict(a) for a in act_rows]
        sessions.append(s)

    conn.close()
    return sessions


def delete_session(session_id: str) -> bool:
    conn = get_db()
    # Delete activities first (app-level cascade)
    conn.execute("DELETE FROM activities WHERE session_id = ?", (session_id,))
    cursor = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def _session_row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["categories"] = json.loads(d.get("categories") or "[]")
    d["activities"] = json.loads(d.get("activities") or "[]")
    return d


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

def create_client(name: str, contact_info: str = None, billing_address: str = None,
                  default_rate: float = None, notes: str = None) -> dict:
    client_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        """INSERT INTO clients (id, name, contact_info, billing_address, default_rate, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (client_id, name, contact_info, billing_address, default_rate, notes, now, now),
    )
    conn.commit()
    conn.close()
    return {"id": client_id, "name": name, "contact_info": contact_info,
            "billing_address": billing_address, "default_rate": default_rate,
            "notes": notes, "created_at": now, "updated_at": now}


def get_client(client_id: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    if not row:
        conn.close()
        return None
    client = _client_row_to_dict(row)
    # Nest matters
    matters = conn.execute(
        "SELECT * FROM matters WHERE client_id = ? ORDER BY name", (client_id,)
    ).fetchall()
    client["matters"] = [_matter_row_to_dict(m) for m in matters]
    conn.close()
    return client


def get_all_clients() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM clients ORDER BY name").fetchall()
    clients = []
    for r in rows:
        c = _client_row_to_dict(r)
        matters = conn.execute(
            "SELECT * FROM matters WHERE client_id = ? ORDER BY name", (r["id"],)
        ).fetchall()
        c["matters"] = [_matter_row_to_dict(m) for m in matters]
        clients.append(c)
    conn.close()
    return clients


def update_client(client_id: str, **kwargs) -> Optional[dict]:
    conn = get_db()
    allowed = {"name", "contact_info", "billing_address", "default_rate", "notes"}
    sets = ["updated_at = ?"]
    values = [datetime.now().isoformat()]
    for key, val in kwargs.items():
        if key in allowed:
            sets.append(f"{key} = ?")
            values.append(val)
    values.append(client_id)
    conn.execute(f"UPDATE clients SET {', '.join(sets)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return get_client(client_id)


def _client_row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["is_internal"] = bool(d.get("is_internal", 0))
    return d


def delete_client(client_id: str) -> tuple[bool, str]:
    """Delete a client. Returns (success, error_message)."""
    conn = get_db()

    # Guard: cannot delete the built-in internal client
    row = conn.execute("SELECT is_internal FROM clients WHERE id = ?", (client_id,)).fetchone()
    if row and row["is_internal"]:
        conn.close()
        return False, "Cannot delete the built-in internal client."

    # App-level FK check: block if active matters exist
    active = conn.execute(
        "SELECT COUNT(*) as cnt FROM matters WHERE client_id = ? AND status = 'active'",
        (client_id,),
    ).fetchone()
    if active["cnt"] > 0:
        conn.close()
        return False, "Cannot delete client with active matters. Close all matters first."

    # Delete closed matters and the client
    conn.execute("DELETE FROM matters WHERE client_id = ?", (client_id,))
    cursor = conn.execute("DELETE FROM clients WHERE id = ?", (client_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0, ""


# ---------------------------------------------------------------------------
# Matters
# ---------------------------------------------------------------------------

def create_matter(client_id: str, name: str, matter_number: str = None,
                  practice_area: str = None, billing_type: str = "hourly",
                  hourly_rate: float = None, keywords: list = None,
                  key_people: list = None, team_members: list = None,
                  notes: str = None) -> dict:
    matter_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn = get_db()

    # App-level FK check
    client = conn.execute("SELECT id FROM clients WHERE id = ?", (client_id,)).fetchone()
    if not client:
        conn.close()
        raise ValueError(f"Client {client_id} not found")

    conn.execute(
        """INSERT INTO matters (id, client_id, name, matter_number, practice_area, billing_type,
           hourly_rate, keywords, key_people, team_members, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (matter_id, client_id, name, matter_number, practice_area, billing_type,
         hourly_rate, json.dumps(keywords or []), json.dumps(key_people or []),
         json.dumps(team_members or []), notes, now, now),
    )
    conn.commit()
    conn.close()
    return {"id": matter_id, "client_id": client_id, "name": name,
            "matter_number": matter_number, "status": "active",
            "practice_area": practice_area, "billing_type": billing_type,
            "hourly_rate": hourly_rate, "keywords": keywords or [],
            "key_people": key_people or [], "team_members": team_members or [],
            "notes": notes, "created_at": now, "updated_at": now}


def get_matter(matter_id: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM matters WHERE id = ?", (matter_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return _matter_row_to_dict(row)


def get_all_matters(status: str = None, client_id: str = None) -> list[dict]:
    conn = get_db()
    query = "SELECT * FROM matters WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if client_id:
        query += " AND client_id = ?"
        params.append(client_id)
    query += " ORDER BY name"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [_matter_row_to_dict(r) for r in rows]


def update_matter(matter_id: str, **kwargs) -> Optional[dict]:
    conn = get_db()
    allowed = {"name", "matter_number", "status", "practice_area", "billing_type",
               "hourly_rate", "keywords", "key_people", "team_members", "notes"}
    sets = ["updated_at = ?"]
    values = [datetime.now().isoformat()]
    for key, val in kwargs.items():
        if key in allowed:
            sets.append(f"{key} = ?")
            if key in ("keywords", "key_people", "team_members"):
                values.append(json.dumps(val))
            else:
                values.append(val)
    values.append(matter_id)
    conn.execute(f"UPDATE matters SET {', '.join(sets)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return get_matter(matter_id)


def delete_matter(matter_id: str) -> tuple[bool, str]:
    """Delete (or soft-delete) a matter. Returns (success, error_message)."""
    conn = get_db()

    # Guard: cannot delete built-in internal matters
    matter_row = conn.execute("SELECT client_id FROM matters WHERE id = ?", (matter_id,)).fetchone()
    if matter_row:
        internal = conn.execute("SELECT is_internal FROM clients WHERE id = ?", (matter_row["client_id"],)).fetchone()
        if internal and internal["is_internal"]:
            conn.close()
            return False, "Cannot delete built-in internal matters."

    # Check if any activities reference this matter
    has_activities = conn.execute(
        "SELECT COUNT(*) as cnt FROM activities WHERE matter_id = ?", (matter_id,)
    ).fetchone()

    if has_activities["cnt"] > 0:
        # Soft-delete: set status to closed
        conn.execute("UPDATE matters SET status = 'closed', updated_at = ? WHERE id = ?",
                      (datetime.now().isoformat(), matter_id))
        conn.commit()
        conn.close()
        return True, ""

    # Hard-delete: no activities reference it
    cursor = conn.execute("DELETE FROM matters WHERE id = ?", (matter_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0, ""


def _matter_row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    for field in ("keywords", "key_people", "team_members"):
        d[field] = json.loads(d.get(field) or "[]")
    return d


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

def get_activities_for_session(session_id: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM activities WHERE session_id = ? ORDER BY sort_order",
        (session_id,),
    ).fetchall()
    conn.close()
    return [_activity_row_to_dict(r) for r in rows]


def insert_activity(session_id: str, app: str, context: str = None, minutes: int = 0,
                    narrative: str = None, category: str = None, matter_id: str = None,
                    billable: bool = True, effective_rate: float = None,
                    sort_order: int = 0, start_time: str = None, end_time: str = None,
                    activity_code: str = None) -> dict:
    activity_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        """INSERT INTO activities (id, session_id, matter_id, app, context, minutes, narrative,
           category, billable, effective_rate, sort_order, created_at,
           start_time, end_time, activity_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (activity_id, session_id, matter_id, app, context, minutes, narrative,
         category, 1 if billable else 0, effective_rate, sort_order, now,
         start_time, end_time, activity_code),
    )
    conn.commit()
    conn.close()
    return {"id": activity_id, "session_id": session_id, "matter_id": matter_id,
            "app": app, "context": context, "minutes": minutes, "narrative": narrative,
            "category": category, "billable": billable, "effective_rate": effective_rate,
            "sort_order": sort_order, "created_at": now,
            "start_time": start_time, "end_time": end_time,
            "activity_code": activity_code}


def update_activity(activity_id: str, **kwargs) -> Optional[dict]:
    conn = get_db()
    allowed = {"matter_id", "narrative", "billable", "effective_rate", "category",
                "minutes", "activity_code", "start_time", "end_time"}
    sets = []
    values = []
    for key, val in kwargs.items():
        if key in allowed:
            sets.append(f"{key} = ?")
            if key == "billable":
                values.append(1 if val else 0)
            else:
                values.append(val)
    if not sets:
        conn.close()
        return None
    values.append(activity_id)
    conn.execute(f"UPDATE activities SET {', '.join(sets)} WHERE id = ?", values)
    conn.commit()

    row = conn.execute("SELECT * FROM activities WHERE id = ?", (activity_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return _activity_row_to_dict(row)


def get_activity(activity_id: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM activities WHERE id = ?", (activity_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return _activity_row_to_dict(row)


def _activity_row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["billable"] = bool(d.get("billable", 1))
    return d


def delete_activity(activity_id: str) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM activities WHERE id = ?", (activity_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def get_next_sort_order(session_id: str) -> int:
    conn = get_db()
    row = conn.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM activities WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    conn.close()
    return row["next_order"]


def get_activities_for_export(date_str: str) -> list[dict]:
    """Get activities joined with matter and client info for CSV export."""
    conn = get_db()
    rows = conn.execute(
        """SELECT a.*, s.start_time as session_start_time,
           m.name as matter_name, m.matter_number, m.practice_area, m.billing_type,
           c.name as client_name
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           LEFT JOIN matters m ON a.matter_id = m.id
           LEFT JOIN clients c ON m.client_id = c.id
           WHERE s.start_time LIKE ?
           ORDER BY a.start_time, a.sort_order""",
        (f"{date_str}%",),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Rate resolution
# ---------------------------------------------------------------------------

def resolve_rate(matter_id: str = None) -> Optional[float]:
    """Resolve the effective hourly rate: matter rate > client rate > None.
    Non-billable matters always return None."""
    if not matter_id:
        return None
    conn = get_db()
    matter = conn.execute("SELECT hourly_rate, client_id, billing_type FROM matters WHERE id = ?", (matter_id,)).fetchone()
    if not matter:
        conn.close()
        return None
    if matter["billing_type"] == "non-billable":
        conn.close()
        return None
    if matter["hourly_rate"] is not None:
        conn.close()
        return matter["hourly_rate"]
    client = conn.execute("SELECT default_rate FROM clients WHERE id = ?", (matter["client_id"],)).fetchone()
    conn.close()
    if client and client["default_rate"] is not None:
        return client["default_rate"]
    return None
