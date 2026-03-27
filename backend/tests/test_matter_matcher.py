"""Tests for post-summarization matter matching."""
from backend.tracker.matter_matcher import match_activities_to_matters


def _make_matter(id, name, keywords=None, status="active", updated_at="2026-03-26T10:00:00"):
    return {
        "id": id,
        "name": name,
        "keywords": keywords or [],
        "status": status,
        "updated_at": updated_at,
    }


def _make_activity(app, context=""):
    return {"app": app, "context": context}


class TestMatterMatcher:
    def test_single_keyword_match(self):
        matters = [_make_matter("m1", "Smith v. Jones", keywords=["smith"])]
        activities = [_make_activity("Word", "Smith v Jones - Motion.docx")]

        result = match_activities_to_matters(activities, matters)
        assert result[0]["matter_id"] == "m1"

    def test_no_match_returns_no_matter_id(self):
        matters = [_make_matter("m1", "Smith v. Jones", keywords=["smith"])]
        activities = [_make_activity("Chrome", "google.com")]

        result = match_activities_to_matters(activities, matters)
        assert "matter_id" not in result[0] or result[0].get("matter_id") is None

    def test_matter_name_is_implicit_keyword(self):
        matters = [_make_matter("m1", "Johnson Estate")]
        activities = [_make_activity("Word", "Johnson Estate - Will Draft.docx")]

        result = match_activities_to_matters(activities, matters)
        assert result[0]["matter_id"] == "m1"

    def test_longest_keyword_wins(self):
        matters = [
            _make_matter("m1", "Smith", keywords=["smith"]),
            _make_matter("m2", "Smith v. Jones", keywords=["smith v. jones"]),
        ]
        activities = [_make_activity("Word", "Smith v. Jones motion")]

        result = match_activities_to_matters(activities, matters)
        assert result[0]["matter_id"] == "m2"

    def test_equal_length_tiebreak_by_updated_at(self):
        matters = [
            _make_matter("m1", "Case A", keywords=["motion"], updated_at="2026-03-25T10:00:00"),
            _make_matter("m2", "Case B", keywords=["motion"], updated_at="2026-03-26T10:00:00"),
        ]
        activities = [_make_activity("Word", "Motion to Compel")]

        result = match_activities_to_matters(activities, matters)
        # m2 should win (more recently updated)
        assert result[0]["matter_id"] == "m2"

    def test_empty_matters_list(self):
        activities = [_make_activity("Word", "document.docx")]
        result = match_activities_to_matters(activities, [])
        assert "matter_id" not in result[0] or result[0].get("matter_id") is None

    def test_case_insensitive_matching(self):
        matters = [_make_matter("m1", "Smith v. Jones", keywords=["SMITH"])]
        activities = [_make_activity("Word", "smith motion draft")]

        result = match_activities_to_matters(activities, matters)
        assert result[0]["matter_id"] == "m1"

    def test_closed_matter_not_matched(self):
        matters = [_make_matter("m1", "Closed Case", keywords=["closed"], status="closed")]
        activities = [_make_activity("Word", "Closed Case draft")]

        result = match_activities_to_matters(activities, matters)
        assert "matter_id" not in result[0] or result[0].get("matter_id") is None

    def test_multiple_activities_matched_independently(self):
        matters = [
            _make_matter("m1", "Smith Case", keywords=["smith"]),
            _make_matter("m2", "Johnson Estate", keywords=["johnson"]),
        ]
        activities = [
            _make_activity("Word", "Smith motion"),
            _make_activity("Word", "Johnson will"),
            _make_activity("Chrome", "weather.com"),
        ]

        result = match_activities_to_matters(activities, matters)
        assert result[0]["matter_id"] == "m1"
        assert result[1]["matter_id"] == "m2"
        assert "matter_id" not in result[2] or result[2].get("matter_id") is None
