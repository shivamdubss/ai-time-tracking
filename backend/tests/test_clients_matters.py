"""Tests for clients and matters CRUD operations."""
import pytest
from backend.database import (
    create_client, get_client, get_all_clients, update_client, delete_client,
    create_matter, get_matter, get_all_matters, update_matter, delete_matter,
    insert_activity, get_activities_for_session, update_activity,
    create_session, resolve_rate,
)


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

class TestClients:
    def test_create_client(self, test_db):
        client = create_client("Acme Corp", default_rate=350.0)
        assert client["name"] == "Acme Corp"
        assert client["default_rate"] == 350.0
        assert client["id"] is not None

    def test_get_client_with_matters(self, test_db):
        client = create_client("Acme Corp")
        create_matter(client["id"], "Smith v. Jones")
        create_matter(client["id"], "Doe Estate")

        fetched = get_client(client["id"])
        assert fetched is not None
        assert len(fetched["matters"]) == 2

    def test_get_nonexistent_client(self, test_db):
        assert get_client("nonexistent") is None

    def test_get_all_clients(self, test_db):
        create_client("Alpha Corp")
        create_client("Beta Inc")
        clients = get_all_clients()
        assert len(clients) == 2

    def test_update_client(self, test_db):
        client = create_client("Old Name", default_rate=200.0)
        updated = update_client(client["id"], name="New Name", default_rate=400.0)
        assert updated["name"] == "New Name"
        assert updated["default_rate"] == 400.0

    def test_delete_client_no_matters(self, test_db):
        client = create_client("Temp Corp")
        success, err = delete_client(client["id"])
        assert success is True
        assert get_client(client["id"]) is None

    def test_delete_client_with_active_matters_blocked(self, test_db):
        client = create_client("Protected Corp")
        create_matter(client["id"], "Active Matter")

        success, err = delete_client(client["id"])
        assert success is False
        assert "active matters" in err.lower()

    def test_delete_client_with_closed_matters_allowed(self, test_db):
        client = create_client("Old Corp")
        matter = create_matter(client["id"], "Closed Case")
        update_matter(matter["id"], status="closed")

        success, err = delete_client(client["id"])
        assert success is True


# ---------------------------------------------------------------------------
# Matters
# ---------------------------------------------------------------------------

class TestMatters:
    def test_create_matter(self, test_db):
        client = create_client("Client A")
        matter = create_matter(
            client["id"], "Smith v. Jones",
            keywords=["smith", "jones"],
            hourly_rate=400.0,
            practice_area="Litigation",
        )
        assert matter["name"] == "Smith v. Jones"
        assert matter["keywords"] == ["smith", "jones"]
        assert matter["hourly_rate"] == 400.0
        assert matter["status"] == "active"

    def test_create_matter_invalid_client(self, test_db):
        with pytest.raises(ValueError, match="not found"):
            create_matter("nonexistent", "Some Matter")

    def test_get_matter(self, test_db):
        client = create_client("Client B")
        matter = create_matter(client["id"], "Big Case", matter_number="2024-CV-1234")
        fetched = get_matter(matter["id"])
        assert fetched["matter_number"] == "2024-CV-1234"

    def test_get_all_matters_filtered(self, test_db):
        c1 = create_client("Client 1")
        c2 = create_client("Client 2")
        create_matter(c1["id"], "Matter A")
        m2 = create_matter(c1["id"], "Matter B")
        create_matter(c2["id"], "Matter C")

        # Filter by client
        matters = get_all_matters(client_id=c1["id"])
        assert len(matters) == 2

        # Filter by status
        update_matter(m2["id"], status="closed")
        active = get_all_matters(status="active")
        assert len(active) == 2

    def test_update_matter_keywords(self, test_db):
        client = create_client("Client")
        matter = create_matter(client["id"], "Case", keywords=["old"])
        updated = update_matter(matter["id"], keywords=["new", "updated"])
        assert updated["keywords"] == ["new", "updated"]

    def test_soft_delete_matter_with_activities(self, test_db):
        client = create_client("Client")
        matter = create_matter(client["id"], "Case")
        create_session("s1", "2026-03-26T10:00:00")
        insert_activity("s1", "VS Code", matter_id=matter["id"])

        success, err = delete_matter(matter["id"])
        assert success is True
        # Should be soft-deleted (closed), not removed
        fetched = get_matter(matter["id"])
        assert fetched is not None
        assert fetched["status"] == "closed"

    def test_hard_delete_matter_without_activities(self, test_db):
        client = create_client("Client")
        matter = create_matter(client["id"], "Empty Case")

        success, err = delete_matter(matter["id"])
        assert success is True
        assert get_matter(matter["id"]) is None


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

class TestActivities:
    def test_insert_and_get_activities(self, test_db):
        create_session("s1", "2026-03-26T10:00:00")
        insert_activity("s1", "VS Code", context="project/src", minutes=30,
                        narrative="Wrote code", category="Administrative", sort_order=0)
        insert_activity("s1", "Chrome", context="google.com", minutes=15,
                        narrative="Research", category="Legal Research", sort_order=1)

        activities = get_activities_for_session("s1")
        assert len(activities) == 2
        assert activities[0]["app"] == "VS Code"
        assert activities[1]["app"] == "Chrome"

    def test_update_activity_narrative(self, test_db):
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word", narrative="Original")

        updated = update_activity(act["id"], narrative="Edited narrative")
        assert updated["narrative"] == "Edited narrative"

    def test_reassign_activity_to_matter(self, test_db):
        client = create_client("Client")
        matter = create_matter(client["id"], "Case A")
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word")

        updated = update_activity(act["id"], matter_id=matter["id"])
        assert updated["matter_id"] == matter["id"]

    def test_reassign_activity_to_unassigned(self, test_db):
        client = create_client("Client")
        matter = create_matter(client["id"], "Case A")
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word", matter_id=matter["id"])

        updated = update_activity(act["id"], matter_id=None)
        assert updated["matter_id"] is None

    def test_activity_with_effective_rate(self, test_db):
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Word", minutes=60, effective_rate=350.0)

        activities = get_activities_for_session("s1")
        assert activities[0]["effective_rate"] == 350.0

    def test_activity_billable_flag(self, test_db):
        create_session("s1", "2026-03-26T10:00:00")
        act = insert_activity("s1", "Calendar", billable=False)

        activities = get_activities_for_session("s1")
        assert activities[0]["billable"] is False


# ---------------------------------------------------------------------------
# Rate resolution
# ---------------------------------------------------------------------------

class TestRateResolution:
    def test_matter_rate_takes_precedence(self, test_db):
        client = create_client("Client", default_rate=300.0)
        matter = create_matter(client["id"], "Case", hourly_rate=400.0)
        assert resolve_rate(matter["id"]) == 400.0

    def test_falls_back_to_client_rate(self, test_db):
        client = create_client("Client", default_rate=300.0)
        matter = create_matter(client["id"], "Case")  # No matter rate
        assert resolve_rate(matter["id"]) == 300.0

    def test_returns_none_when_no_rate(self, test_db):
        client = create_client("Client")  # No rate
        matter = create_matter(client["id"], "Case")  # No rate
        assert resolve_rate(matter["id"]) is None

    def test_returns_none_for_null_matter(self, test_db):
        assert resolve_rate(None) is None

    def test_returns_none_for_nonexistent_matter(self, test_db):
        assert resolve_rate("nonexistent") is None
