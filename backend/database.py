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


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def _round_to_decimal_hours(minutes: int) -> float:
    """Python equivalent of frontend roundToDecimalHours — 0.1 hr increments."""
    if minutes <= 0:
        return 0.0
    hours = minutes / 60
    return max(round(hours * 10) / 10, 0.1)


def _count_working_days(start_date: str, end_date: str) -> tuple[int, int, int]:
    """Count total working days, elapsed working days (up to today), and remaining."""
    from datetime import date as date_type
    start = date_type.fromisoformat(start_date)
    end = date_type.fromisoformat(end_date)
    today = date_type.today()

    total = 0
    elapsed = 0
    d = start
    while d <= end:
        if d.weekday() < 5:  # Mon-Fri
            total += 1
            if d <= today:
                elapsed += 1
        d += timedelta(days=1)

    remaining = total - elapsed
    return total, elapsed, remaining


def get_analytics_summary(start_date: str, end_date: str, available_hours_per_day: float = 8.0) -> dict:
    conn = get_db()
    rows = conn.execute(
        """SELECT a.minutes, a.billable, a.effective_rate
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'""",
        (start_date, end_date),
    ).fetchall()
    conn.close()

    billable_min = 0
    non_billable_min = 0
    revenue = 0.0

    for r in rows:
        mins = r["minutes"] or 0
        if r["billable"]:
            billable_min += mins
            rate = r["effective_rate"] or 0
            revenue += _round_to_decimal_hours(mins) * rate
        else:
            non_billable_min += mins

    billable_hours = round(billable_min / 60, 2)
    non_billable_hours = round(non_billable_min / 60, 2)
    total_hours = round((billable_min + non_billable_min) / 60, 2)

    total_days, elapsed_days, remaining_days = _count_working_days(start_date, end_date)
    available_hours = round(total_days * available_hours_per_day, 1)
    elapsed_available = round(elapsed_days * available_hours_per_day, 1)

    utilization_rate = round(billable_hours / elapsed_available, 4) if elapsed_available > 0 else 0.0
    effective_rate = round(revenue / billable_hours, 2) if billable_hours > 0 else 0.0
    realization_rate = round(billable_hours / total_hours, 4) if total_hours > 0 else 0.0

    # Forecast
    if elapsed_days > 0:
        daily_avg_billable = round(billable_hours / elapsed_days, 2)
        daily_avg_revenue = revenue / elapsed_days
        projected_monthly_revenue = round(daily_avg_revenue * total_days, 2)
    else:
        daily_avg_billable = 0.0
        projected_monthly_revenue = 0.0

    return {
        "billable_hours": billable_hours,
        "non_billable_hours": non_billable_hours,
        "total_hours": total_hours,
        "revenue": round(revenue, 2),
        "effective_rate": effective_rate,
        "utilization_rate": utilization_rate,
        "realization_rate": realization_rate,
        "available_hours": available_hours,
        "working_days": elapsed_days,
        "forecast": {
            "projected_monthly_revenue": projected_monthly_revenue,
            "daily_average_billable": daily_avg_billable,
            "working_days_remaining": remaining_days,
        },
    }


def get_analytics_trend(start_date: str, end_date: str, granularity: str = "day") -> list[dict]:
    if granularity == "week":
        group_expr = "strftime('%Y-W%W', s.start_time)"
    elif granularity == "month":
        group_expr = "strftime('%Y-%m', s.start_time)"
    else:
        group_expr = "date(s.start_time)"

    conn = get_db()
    rows = conn.execute(
        f"""SELECT {group_expr} as period,
               SUM(CASE WHEN a.billable = 1 THEN a.minutes ELSE 0 END) as billable_min,
               SUM(CASE WHEN a.billable = 0 THEN a.minutes ELSE 0 END) as non_billable_min
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'
           GROUP BY {group_expr}
           ORDER BY {group_expr}""",
        (start_date, end_date),
    ).fetchall()

    # Compute revenue per period (need per-activity rounding)
    period_revenue: dict[str, float] = {}
    detail_rows = conn.execute(
        f"""SELECT {group_expr} as period, a.minutes, a.billable, a.effective_rate
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'""",
        (start_date, end_date),
    ).fetchall()
    conn.close()

    for r in detail_rows:
        p = r["period"]
        if r["billable"] and r["effective_rate"]:
            rev = _round_to_decimal_hours(r["minutes"] or 0) * r["effective_rate"]
            period_revenue[p] = period_revenue.get(p, 0) + rev

    result = []
    for r in rows:
        p = r["period"]
        result.append({
            "date": p,
            "billable_hours": round((r["billable_min"] or 0) / 60, 2),
            "non_billable_hours": round((r["non_billable_min"] or 0) / 60, 2),
            "revenue": round(period_revenue.get(p, 0), 2),
        })
    return result


def get_analytics_by_matter(start_date: str, end_date: str, limit: int = 10) -> dict:
    conn = get_db()
    rows = conn.execute(
        """SELECT a.matter_id, m.name as matter_name, c.name as client_name,
               SUM(CASE WHEN a.billable = 1 THEN a.minutes ELSE 0 END) as billable_min
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           LEFT JOIN matters m ON a.matter_id = m.id
           LEFT JOIN clients c ON m.client_id = c.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'
           GROUP BY a.matter_id
           ORDER BY billable_min DESC""",
        (start_date, end_date),
    ).fetchall()

    # Compute revenue per matter with per-activity rounding
    detail_rows = conn.execute(
        """SELECT a.matter_id, a.minutes, a.billable, a.effective_rate
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'""",
        (start_date, end_date),
    ).fetchall()
    conn.close()

    matter_revenue: dict[str | None, float] = {}
    for r in detail_rows:
        mid = r["matter_id"]
        if r["billable"] and r["effective_rate"]:
            rev = _round_to_decimal_hours(r["minutes"] or 0) * r["effective_rate"]
            matter_revenue[mid] = matter_revenue.get(mid, 0) + rev

    total_billable_min = sum((r["billable_min"] or 0) for r in rows)

    data = []
    unassigned = {"hours": 0.0, "revenue": 0.0}

    for r in rows:
        b_min = r["billable_min"] or 0
        b_hours = round(b_min / 60, 2)
        rev = round(matter_revenue.get(r["matter_id"], 0), 2)
        pct = round(b_min / total_billable_min * 100, 1) if total_billable_min > 0 else 0.0

        if r["matter_id"] is None:
            unassigned = {"hours": b_hours, "revenue": rev}
            continue

        eff_rate = round(rev / b_hours, 2) if b_hours > 0 else 0.0
        data.append({
            "matter_id": r["matter_id"],
            "matter_name": r["matter_name"] or "Unknown",
            "client_name": r["client_name"] or "Unknown",
            "billable_hours": b_hours,
            "revenue": rev,
            "effective_rate": eff_rate,
            "percentage": pct,
        })

    return {"data": data[:limit], "unassigned": unassigned}


def get_analytics_by_category(start_date: str, end_date: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        """SELECT a.category,
               SUM(CASE WHEN a.billable = 1 THEN a.minutes ELSE 0 END) as billable_min,
               SUM(CASE WHEN a.billable = 0 THEN a.minutes ELSE 0 END) as non_billable_min
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'
           GROUP BY a.category
           ORDER BY (COALESCE(billable_min, 0) + COALESCE(non_billable_min, 0)) DESC""",
        (start_date, end_date),
    ).fetchall()

    detail_rows = conn.execute(
        """SELECT a.category, a.minutes, a.billable, a.effective_rate
           FROM activities a
           JOIN sessions s ON a.session_id = s.id
           WHERE date(s.start_time) BETWEEN ? AND ?
             AND s.status = 'completed'""",
        (start_date, end_date),
    ).fetchall()
    conn.close()

    cat_revenue: dict[str, float] = {}
    for r in detail_rows:
        cat = r["category"] or "Administrative"
        if r["billable"] and r["effective_rate"]:
            rev = _round_to_decimal_hours(r["minutes"] or 0) * r["effective_rate"]
            cat_revenue[cat] = cat_revenue.get(cat, 0) + rev

    total_min = sum(((r["billable_min"] or 0) + (r["non_billable_min"] or 0)) for r in rows)

    result = []
    for r in rows:
        cat = r["category"] or "Administrative"
        b_min = r["billable_min"] or 0
        nb_min = r["non_billable_min"] or 0
        pct = round((b_min + nb_min) / total_min * 100, 1) if total_min > 0 else 0.0
        result.append({
            "category": cat,
            "billable_hours": round(b_min / 60, 2),
            "non_billable_hours": round(nb_min / 60, 2),
            "revenue": round(cat_revenue.get(cat, 0), 2),
            "percentage": pct,
        })
    return result


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
