import os
import tempfile
import pytest
from pathlib import Path

from backend.database import get_db, init_db, DB_PATH


@pytest.fixture(autouse=True)
def test_db(tmp_path, monkeypatch):
    """Use a temporary database for every test."""
    db_path = tmp_path / "test_timetrack.db"
    monkeypatch.setattr("backend.database.DB_DIR", tmp_path)
    monkeypatch.setattr("backend.database.DB_PATH", db_path)
    init_db()
    yield db_path


@pytest.fixture
def db_conn(test_db):
    """Get a database connection for assertions."""
    conn = get_db()
    yield conn
    conn.close()
