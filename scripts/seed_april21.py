#!/usr/bin/env python3
"""Seed a realistic day of time entries on 2026-04-21.

Reuses clients/matters from seed_family_law.py so the day is consistent with
the rest of the seeded practice. Safe to run standalone — inserts clients/
matters if they don't already exist.

Usage:
    python scripts/seed_april21.py          # seed the day
    python scripts/seed_april21.py --clean  # remove only the April 21 entries
"""
import argparse
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_family_law import (
    CLIENTS,
    MATTERS,
    NON_BILLABLE,
    utbms_to_category,
    resolve_rate,
    is_billable,
    DB_PATH,
    DB_DIR,
)

DATE = "2026-04-21"
PREFIX = "seed-apr21-"

SESSIONS: list[tuple] = []
ACTIVITIES: list[tuple] = []


def _s(sid, sh, sm, eh, em, summary):
    SESSIONS.append((f"{PREFIX}{sid}", DATE, sh, sm, eh, em, summary))


def _a(sid, mid, app, ctx, mins, narr, code, sh, sm, eh, em):
    ACTIVITIES.append((f"{PREFIX}{sid}", mid, app, ctx, mins, narr, code, sh, sm, eh, em))


# ── 7:30-9:00 — morning intake + Thompson deposition prep ─────────────────
_s("s01", 7, 30, 9, 0,
   "Morning review of overnight emails and Thompson deposition prep.")

_a("s01", "nb-admin", "Outlook",
   "Inbox triage — overnight correspondence",
   15, "Triaged overnight inbox across active matters; flagged three items requiring same-day response and calendared one new hearing notice",
   "A106", 7, 30, 7, 45)
_a("s01", "seed-mt01", "Adobe Acrobat",
   "Thompson_Robert_Deposition_Exhibit_Binder.pdf",
   45, "Reviewed assembled exhibit binder for Robert Thompson deposition; cross-referenced exhibits against deposition outline and confirmed all business records properly authenticated",
   "L330", 7, 45, 8, 30)
_a("s01", "seed-mt01", "Microsoft Word",
   "Thompson_Deposition_Outline_RThompson_v3.docx",
   30, "Revised deposition outline incorporating findings from forensic accountant's supplemental report; added follow-up questions regarding undisclosed business receivables",
   "L330", 8, 30, 9, 0)

# ── 9:15-12:15 — Robert Thompson deposition ───────────────────────────────
_s("s02", 9, 15, 12, 15,
   "Conducted deposition of Robert Thompson in Thompson v. Thompson dissolution.")

_a("s02", "seed-mt01", "Zoom",
   "Deposition: Robert Thompson — Court Reporter: Rhonda Mills, CSR",
   165, "Conducted deposition of respondent Robert Thompson over three hours; examined witness regarding business income, undisclosed financial accounts, dissipation of marital funds, and lifestyle expenditures; marked and introduced 14 exhibits",
   "L330", 9, 15, 12, 0)
_a("s02", "seed-mt01", "Microsoft Word",
   "Thompson_Deposition_Post_Memo_042126.docx",
   15, "Drafted preliminary post-deposition memorandum summarizing key admissions and identified follow-up discovery items; noted witness credibility issues for trial preparation",
   "A103", 12, 0, 12, 15)

# ── 13:00-14:30 — Ramirez contempt hearing prep ───────────────────────────
_s("s03", 13, 0, 14, 30,
   "Prepared for Ramirez contempt of visitation hearing set for 4/24.")

_a("s03", "seed-mt04", "Microsoft Word",
   "Ramirez_Contempt_Hearing_Brief.docx",
   42, "Drafted hearing brief for contempt of visitation order; outlined pattern of missed visitations, client's documented attempts to enforce order, and proposed remedial sanctions",
   "A103", 13, 0, 13, 42)
_a("s03", "seed-mt04", "Westlaw",
   "Search: Colorado civil contempt visitation enforcement remedial sanctions",
   24, "Researched remedial versus punitive contempt distinctions under Colorado law; confirmed availability of make-up parenting time and attorney fees as remedial sanctions",
   "A104", 13, 42, 14, 6)
_a("s03", "seed-mt04", "Clio",
   "Matter: Ramirez — Contempt Hearing | Exhibits",
   24, "Organized exhibit list for contempt hearing including visitation logs, text messages, school pickup records, and prior court orders; prepared witness list",
   "L140", 14, 6, 14, 30)

# ── 14:45-15:45 — Chen prenup finalization call ───────────────────────────
_s("s04", 14, 45, 15, 45,
   "Client call with Lisa Chen to finalize prenuptial agreement terms.")

_a("s04", "seed-mt05", "Zoom",
   "Client Call: Lisa Chen — Prenup Final Review Before Execution",
   42, "Videoconference with client to walk through final version of prenuptial agreement section-by-section; confirmed client's understanding of sunset clause, alimony waiver, and IP provisions; client authorized execution",
   "A101", 14, 45, 15, 27)
_a("s04", "seed-mt05", "Microsoft Word",
   "Chen_Nguyen_Prenuptial_Agreement_FINAL.docx",
   18, "Prepared final execution copy of prenuptial agreement with signature pages and notary acknowledgments; coordinated signing appointment for 4/24",
   "A103", 15, 27, 15, 45)

# ── 16:00-17:00 — Whitfield property settlement + Okafor adoption status ─
_s("s05", 16, 0, 17, 0,
   "Whitfield property settlement negotiations and Okafor adoption status check.")

_a("s05", "seed-mt09", "Outlook",
   "Steven Kessler, Esq. — Whitfield Settlement Counter-Proposal",
   24, "Reviewed opposing counsel's counter-proposal on property division; conferred with forensic accountant regarding impact of proposed rental property valuation adjustments",
   "A102", 16, 0, 16, 24)
_a("s05", "seed-mt09", "Microsoft Word",
   "Whitfield_Property_Settlement_Counter_v3.docx",
   18, "Revised property settlement agreement with counter-counter-proposal; adjusted distribution to account for pension coverture fraction and rental property appreciation",
   "A103", 16, 24, 16, 42)
_a("s05", "seed-mt07", "Chrome",
   "Colorado Courts — Okafor Adoption Case Status",
   18, "Checked court docket for Okafor stepparent adoption petition; confirmed GAL appointment and identified anticipated finalization hearing window in May 2026",
   "A106", 16, 42, 17, 0)

# ── 17:15-18:00 — end-of-day admin + billing ──────────────────────────────
_s("s06", 17, 15, 18, 0,
   "End-of-day billing review and calendar for balance of week.")

_a("s06", "nb-admin", "Clio",
   "Clio — Daily Time Entry Review",
   24, "Reviewed and approved daily time entries across active matters; corrected narrative on two entries to conform with firm billing guidelines",
   "A104", 17, 15, 17, 39)
_a("s06", "nb-admin", "Outlook",
   "Firm Admin — Weekly Calendar Lookahead",
   21, "Reviewed calendar for balance of week; confirmed coverage for Thursday Ramirez contempt hearing and Chen prenup signing; set reminders for three upcoming deadlines",
   "A106", 17, 39, 18, 0)


NOW = f"{DATE}T23:30:00"


def get_db() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def clean(conn: sqlite3.Connection):
    conn.execute(f"DELETE FROM activities WHERE id LIKE '{PREFIX}%' OR session_id LIKE '{PREFIX}%'")
    conn.execute(f"DELETE FROM sessions WHERE id LIKE '{PREFIX}%'")
    conn.commit()
    print(f"Removed April 21 seed entries.")


def ensure_clients_matters(conn: sqlite3.Connection):
    """Insert CLIENTS and MATTERS from seed_family_law if missing."""
    added_clients = 0
    for c in CLIENTS:
        exists = conn.execute("SELECT 1 FROM clients WHERE id=?", (c["id"],)).fetchone()
        if exists:
            continue
        conn.execute(
            """INSERT INTO clients (id, name, contact_info, billing_address, default_rate, notes, is_internal, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (c["id"], c["name"], c["contact_info"], c["billing_address"],
             c["default_rate"], c["notes"], NOW, NOW),
        )
        added_clients += 1

    added_matters = 0
    for m in MATTERS:
        exists = conn.execute("SELECT 1 FROM matters WHERE id=?", (m["id"],)).fetchone()
        if exists:
            continue
        conn.execute(
            """INSERT INTO matters (id, client_id, name, matter_number, status, practice_area,
               billing_type, hourly_rate, keywords, key_people, team_members, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (m["id"], m["client_id"], m["name"], m["matter_number"], m["status"],
             m["practice_area"], m["billing_type"], m["hourly_rate"],
             json.dumps(m["keywords"]), json.dumps(m["key_people"]),
             json.dumps(m["team_members"]), m["notes"], NOW, NOW),
        )
        added_matters += 1

    if added_clients:
        print(f"  Created {added_clients} clients")
    if added_matters:
        print(f"  Created {added_matters} matters")


def seed(conn: sqlite3.Connection):
    existing = conn.execute(
        f"SELECT COUNT(*) AS cnt FROM sessions WHERE id LIKE '{PREFIX}%'"
    ).fetchone()
    if existing["cnt"] > 0:
        print(f"April 21 seed already present ({existing['cnt']} sessions). Use --clean first to re-seed.")
        return

    ensure_clients_matters(conn)

    for sid, date, sh, sm, eh, em, summary in SESSIONS:
        start_time = f"{date}T{sh:02d}:{sm:02d}:00"
        end_time = f"{date}T{eh:02d}:{em:02d}:00"

        cat_minutes = defaultdict(int)
        for a_sid, _, _, _, a_mins, _, a_code, *_ in ACTIVITIES:
            if a_sid == sid:
                cat_minutes[utbms_to_category(a_code)] += a_mins
        total_mins = sum(cat_minutes.values()) or 1
        categories = [
            {"name": cat, "minutes": mins, "percentage": round(mins / total_mins * 100)}
            for cat, mins in sorted(cat_minutes.items(), key=lambda x: -x[1])
        ]

        conn.execute(
            """INSERT INTO sessions (id, start_time, end_time, status, summary, categories, activities, created_at)
               VALUES (?, ?, ?, 'completed', ?, ?, '[]', ?)""",
            (sid, start_time, end_time, summary, json.dumps(categories), NOW),
        )
    print(f"  Created {len(SESSIONS)} sessions")

    for i, (a_sid, a_mid, app, ctx, mins, narr, code, a_sh, a_sm, a_eh, a_em) in enumerate(ACTIVITIES):
        act_id = f"{PREFIX}a{i+1:03d}"
        start_time = f"{DATE}T{a_sh:02d}:{a_sm:02d}:00"
        end_time = f"{DATE}T{a_eh:02d}:{a_em:02d}:00"
        category = utbms_to_category(code)
        billable = 1 if is_billable(a_mid) else 0
        rate = resolve_rate(a_mid)
        sort_order = sum(1 for prev_sid, *_ in ACTIVITIES[:i] if prev_sid == a_sid)

        conn.execute(
            """INSERT INTO activities (id, session_id, matter_id, app, context, minutes, narrative,
               category, billable, effective_rate, sort_order, start_time, end_time,
               activity_code, approval_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (act_id, a_sid, a_mid, app, ctx, mins, narr, category, billable, rate,
             sort_order, start_time, end_time, code, NOW),
        )
    print(f"  Created {len(ACTIVITIES)} activities")

    conn.commit()
    print(f"\nDone! Open Donna and browse {DATE}.")


def main():
    parser = argparse.ArgumentParser(description="Seed a realistic day of entries on 2026-04-21")
    parser.add_argument("--clean", action="store_true", help="Remove only April 21 entries")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Start Donna at least once to initialize the database.")
        sys.exit(1)

    conn = get_db()
    try:
        if args.clean:
            clean(conn)
        else:
            seed(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
