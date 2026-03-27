"""Tests for core database operations."""
from backend.database import create_session, get_session, get_sessions_by_date, delete_session, update_session


def test_create_and_get_session(test_db):
    result = create_session("test-1", "2026-03-26T10:00:00")
    assert result["id"] == "test-1"
    assert result["status"] == "tracking"

    session = get_session("test-1")
    assert session is not None
    assert session["id"] == "test-1"
    assert session["start_time"] == "2026-03-26T10:00:00"


def test_get_nonexistent_session(test_db):
    assert get_session("nonexistent") is None


def test_get_sessions_by_date(test_db):
    create_session("s1", "2026-03-26T09:00:00")
    create_session("s2", "2026-03-26T14:00:00")
    create_session("s3", "2026-03-25T10:00:00")

    sessions = get_sessions_by_date("2026-03-26")
    assert len(sessions) == 2
    assert sessions[0]["id"] == "s1"
    assert sessions[1]["id"] == "s2"


def test_delete_session(test_db):
    create_session("del-1", "2026-03-26T10:00:00")
    assert delete_session("del-1") is True
    assert get_session("del-1") is None
    assert delete_session("del-1") is False


def test_update_session(test_db):
    create_session("upd-1", "2026-03-26T10:00:00")
    update_session("upd-1", status="completed", summary="Did some work")

    session = get_session("upd-1")
    assert session["status"] == "completed"
    assert session["summary"] == "Did some work"
