import sqlite3
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

DB_DIR = Path.home() / "Library" / "Application Support" / "TimeTrack"
DB_PATH = DB_DIR / "timetrack.db"


def get_db() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            start_time TEXT NOT NULL,
            end_time TEXT,
            status TEXT DEFAULT 'tracking',
            summary TEXT,
            categories TEXT DEFAULT '[]',
            activities TEXT DEFAULT '[]',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def prune_old_sessions():
    """Delete sessions older than 7 days."""
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    conn = get_db()
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
    return _row_to_dict(row)


def get_sessions_by_date(date_str: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM sessions WHERE start_time LIKE ? ORDER BY start_time ASC",
        (f"{date_str}%",),
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def delete_session(session_id: str) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["categories"] = json.loads(d.get("categories") or "[]")
    d["activities"] = json.loads(d.get("activities") or "[]")
    return d
