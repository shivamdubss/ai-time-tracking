"""Tests for the system working without any clients/matters created.

Validates that sessions, activities, and matching all work gracefully
when the client/matter tables are empty.
"""
import pytest
from backend.database import (
    create_session, get_session, get_sessions_by_date, update_session,
    insert_activity, get_activities_for_session, update_activity,
    get_all_matters, get_all_clients, resolve_rate,
    create_client, create_matter,
)
from backend.tracker.matter_matcher import match_activities_to_matters


class TestNoClientsFlow:
    """System should work fully with zero clients/matters."""

    def test_only_internal_client_exists(self, test_db):
        clients = get_all_clients()
        assert len(clients) == 1
        assert clients[0]["is_internal"] is True

        matters = get_all_matters()
        assert len(matters) == 4  # Four internal matters
        for m in matters:
            assert m["billing_type"] == "non-billable"

    def test_session_works_without_matters(self, test_db):
        session = create_session("s1", "2026-03-26T10:00:00")
        assert session["status"] == "tracking"

        update_session("s1", status="completed", summary="Did work")
        s = get_session("s1")
        assert s["status"] == "completed"

    def test_activities_inserted_without_matter(self, test_db):
        create_session("s1", "2026-03-26T10:00:00")

        act = insert_activity(
            session_id="s1",
            app="Microsoft Word",
            context="Motion to Compel.docx",
            minutes=30,
            narrative="Drafted motion to compel",
            category="Document Drafting",
            matter_id=None,
            effective_rate=None,
            sort_order=0,
        )

        assert act["matter_id"] is None
        assert act["effective_rate"] is None
        assert act["id"] is not None

        activities = get_activities_for_session("s1")
        assert len(activities) == 1
        assert activities[0]["matter_id"] is None

    def test_matcher_with_no_matters_returns_unassigned(self, test_db):
        activities = [
            {"app": "Word", "context": "Smith v Jones motion.docx", "minutes": 30, "narrative": "Drafted motion"},
            {"app": "Chrome", "context": "Westlaw - case search", "minutes": 15, "narrative": "Research"},
        ]
        matters = []

        result = match_activities_to_matters(activities, matters)
        assert len(result) == 2
        # No matter_id should be set
        for act in result:
            assert act.get("matter_id") is None

    def test_rate_resolves_to_none_without_matters(self, test_db):
        assert resolve_rate(None) is None
        assert resolve_rate("nonexistent") is None

    def test_sessions_by_date_returns_activities_without_matters(self, test_db):
        create_session("s1", "2026-03-26T10:00:00")
        update_session("s1", end_time="2026-03-26T11:00:00", status="completed", summary="Work")

        insert_activity("s1", "Word", context="doc.docx", minutes=30,
                        narrative="Drafted doc", category="Document Drafting", sort_order=0)
        insert_activity("s1", "Chrome", context="westlaw.com", minutes=15,
                        narrative="Research", category="Legal Research", sort_order=1)

        sessions = get_sessions_by_date("2026-03-26")
        assert len(sessions) == 1
        # Activities should come from the normalized table
        assert len(sessions[0]["activities"]) == 2
        assert sessions[0]["activities"][0]["app"] == "Word"
        assert sessions[0]["activities"][0]["matter_id"] is None


class TestRetroactiveAssignment:
    """After tracking without matters, user creates matters and assigns retroactively."""

    def test_assign_matter_to_existing_activity(self, test_db):
        # Step 1: Track a session with no matters
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word", context="Smith motion.docx",
                              minutes=30, narrative="Drafted motion", sort_order=0)
        assert act["matter_id"] is None

        # Step 2: Create client and matter
        client = create_client("Acme Corp", default_rate=350.0)
        matter = create_matter(client["id"], "Smith v. Jones", keywords=["smith"])

        # Step 3: Retroactively assign the activity
        updated = update_activity(act["id"], matter_id=matter["id"])
        assert updated["matter_id"] == matter["id"]

        # Verify it persisted
        activities = get_activities_for_session("s1")
        assert activities[0]["matter_id"] == matter["id"]

    def test_assign_rate_retroactively(self, test_db):
        # Track session without matters
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word", minutes=60, sort_order=0)
        assert act["effective_rate"] is None

        # Create client with rate
        client = create_client("Client", default_rate=400.0)
        matter = create_matter(client["id"], "Case A")

        # Assign matter and update rate
        rate = resolve_rate(matter["id"])
        updated = update_activity(act["id"], matter_id=matter["id"], effective_rate=rate)
        assert updated["matter_id"] == matter["id"]
        assert updated["effective_rate"] == 400.0

    def test_unassign_matter_from_activity(self, test_db):
        client = create_client("Client")
        matter = create_matter(client["id"], "Case")
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word", matter_id=matter["id"], sort_order=0)

        # Unassign
        updated = update_activity(act["id"], matter_id=None)
        assert updated["matter_id"] is None

    def test_multiple_sessions_mixed_assignment(self, test_db):
        # Session 1: tracked before any clients exist
        create_session("s1", "2026-03-26T09:00:00")
        act1 = insert_activity("s1", "Word", minutes=30, sort_order=0)
        act2 = insert_activity("s1", "Chrome", minutes=15, sort_order=1)

        # Session 2: also no clients
        create_session("s2", "2026-03-26T14:00:00")
        act3 = insert_activity("s2", "Word", minutes=45, sort_order=0)

        # Now create a client + matter
        client = create_client("Big Corp", default_rate=500.0)
        matter = create_matter(client["id"], "Big Case")

        # Assign only act1 and act3
        update_activity(act1["id"], matter_id=matter["id"])
        update_activity(act3["id"], matter_id=matter["id"])

        # Verify mixed state
        s1_acts = get_activities_for_session("s1")
        assert s1_acts[0]["matter_id"] == matter["id"]   # assigned
        assert s1_acts[1]["matter_id"] is None             # still unassigned

        s2_acts = get_activities_for_session("s2")
        assert s2_acts[0]["matter_id"] == matter["id"]   # assigned
