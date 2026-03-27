#!/usr/bin/env python3
"""Seed realistic family law firm data into the TimeTrack database.

Usage:
    python scripts/seed_family_law.py          # seed data
    python scripts/seed_family_law.py --clean   # remove seeded data only
"""
import argparse
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

DB_DIR = Path.home() / "Library" / "Application Support" / "TimeTrack"
DB_PATH = DB_DIR / "timetrack.db"

# ---------------------------------------------------------------------------
# All seeded IDs use a "seed-" prefix for safe cleanup
# ---------------------------------------------------------------------------

CLIENTS = [
    {
        "id": "seed-cl01",
        "name": "Thompson, Jennifer",
        "contact_info": "jennifer.thompson@gmail.com | (303) 555-0142",
        "billing_address": "4210 Elm Street, Denver, CO 80220",
        "default_rate": 375.0,
        "notes": "High-asset divorce. Referred by Judge Reeves' clerk. Sensitive — husband is local business owner.",
    },
    {
        "id": "seed-cl02",
        "name": "Ramirez, Carlos",
        "contact_info": "c.ramirez@outlook.com | (303) 555-0287",
        "billing_address": "1855 Federal Blvd, Apt 12, Denver, CO 80204",
        "default_rate": 275.0,
        "notes": "Custody modification — ex-wife relocated to Kansas. Payment plan: $1,500/month.",
    },
    {
        "id": "seed-cl03",
        "name": "Chen, Lisa & Brian",
        "contact_info": "lisa.chen@protonmail.com | (720) 555-0391",
        "billing_address": "9020 S. Quebec St, Suite 200, Highlands Ranch, CO 80130",
        "default_rate": 375.0,
        "notes": "Prenuptial agreement. Wedding date June 15, 2026. Both have significant pre-marital assets.",
    },
    {
        "id": "seed-cl04",
        "name": "Okafor, Grace",
        "contact_info": "grace.okafor@yahoo.com | (303) 555-0518",
        "billing_address": "2740 Martin Luther King Blvd, Denver, CO 80205",
        "default_rate": 275.0,
        "notes": "Stepparent adoption. Biological father's rights previously terminated. Also pursuing name change.",
    },
    {
        "id": "seed-cl05",
        "name": "Whitfield, Mark",
        "contact_info": "mark.whitfield@comcast.net | (720) 555-0673",
        "billing_address": "6100 W. Colfax Ave, Lakewood, CO 80214",
        "default_rate": 350.0,
        "notes": "Divorce with complex property division — two rental properties, pension, 401(k). Wife represented by Kessler & Pratt.",
    },
]

MATTERS = [
    {
        "id": "seed-mt01",
        "client_id": "seed-cl01",
        "name": "Thompson v. Thompson — Dissolution",
        "matter_number": "2025-FL-001",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 375.0,
        "keywords": ["thompson", "dissolution", "divorce", "property division", "alimony"],
        "key_people": [
            {"name": "Robert Thompson", "role": "Respondent"},
            {"name": "James Hadley, Esq.", "role": "Opposing Counsel"},
            {"name": "Hon. Patricia Reeves", "role": "Judge"},
            {"name": "Emma Thompson (age 14)", "role": "Child"},
            {"name": "Lucas Thompson (age 11)", "role": "Child"},
        ],
        "team_members": [
            {"name": "Sarah Mitchell", "role": "Lead Attorney"},
            {"name": "Rachel Torres", "role": "Paralegal"},
        ],
        "notes": "Filed 10/2025. Temporary orders entered 12/2025. Trial set for 6/2026.",
    },
    {
        "id": "seed-mt02",
        "client_id": "seed-cl01",
        "name": "Thompson — Temporary Custody Orders",
        "matter_number": "2025-FL-002",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 375.0,
        "keywords": ["thompson", "custody", "temporary orders", "parenting time"],
        "key_people": [
            {"name": "Robert Thompson", "role": "Respondent"},
            {"name": "James Hadley, Esq.", "role": "Opposing Counsel"},
            {"name": "Hon. Patricia Reeves", "role": "Judge"},
            {"name": "Dr. Alan Frost", "role": "Custody Evaluator"},
        ],
        "team_members": [
            {"name": "Sarah Mitchell", "role": "Lead Attorney"},
            {"name": "David Park", "role": "Associate"},
        ],
        "notes": "Motion to modify temporary custody — father seeking 50/50 parenting time.",
    },
    {
        "id": "seed-mt03",
        "client_id": "seed-cl02",
        "name": "Ramirez v. Dawson — Custody Modification",
        "matter_number": "2025-FL-003",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 275.0,
        "keywords": ["ramirez", "dawson", "custody", "modification", "relocation"],
        "key_people": [
            {"name": "Maria Dawson", "role": "Respondent"},
            {"name": "Linda Cho, Esq.", "role": "Opposing Counsel"},
            {"name": "Hon. Michael Grant", "role": "Judge"},
            {"name": "Sofia Ramirez (age 8)", "role": "Child"},
            {"name": "Dr. Patricia Simmons", "role": "Mediator"},
        ],
        "team_members": [
            {"name": "David Park", "role": "Lead Attorney"},
            {"name": "Rachel Torres", "role": "Paralegal"},
        ],
        "notes": "Mother relocated to Wichita, KS without court approval. Father seeking primary custody.",
    },
    {
        "id": "seed-mt04",
        "client_id": "seed-cl02",
        "name": "Ramirez — Contempt of Visitation Order",
        "matter_number": "2026-FL-001",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 275.0,
        "keywords": ["ramirez", "contempt", "visitation", "enforcement"],
        "key_people": [
            {"name": "Maria Dawson", "role": "Respondent"},
            {"name": "Linda Cho, Esq.", "role": "Opposing Counsel"},
            {"name": "Hon. Michael Grant", "role": "Judge"},
        ],
        "team_members": [
            {"name": "David Park", "role": "Lead Attorney"},
        ],
        "notes": "Three missed visitation weekends in Jan-Feb 2026. Filed contempt motion 3/5/2026.",
    },
    {
        "id": "seed-mt05",
        "client_id": "seed-cl03",
        "name": "Chen & Nguyen — Prenuptial Agreement",
        "matter_number": "2025-FL-004",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 375.0,
        "keywords": ["chen", "nguyen", "prenup", "prenuptial", "premarital"],
        "key_people": [
            {"name": "Brian Nguyen", "role": "Fiance"},
            {"name": "Karen Wells, Esq.", "role": "Fiance's Independent Counsel"},
        ],
        "team_members": [
            {"name": "Sarah Mitchell", "role": "Lead Attorney"},
        ],
        "notes": "Lisa has $2.1M in pre-marital assets (tech stock). Brian has commercial real estate. Wedding 6/15/2026.",
    },
    {
        "id": "seed-mt06",
        "client_id": "seed-cl03",
        "name": "Chen — Estate Planning Referral",
        "matter_number": "2025-FL-005",
        "status": "closed",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": None,
        "keywords": ["chen", "estate", "referral"],
        "key_people": [
            {"name": "Diane Kowalski, Esq.", "role": "Estate Planning Attorney (referred)"},
        ],
        "team_members": [
            {"name": "Sarah Mitchell", "role": "Lead Attorney"},
        ],
        "notes": "Referred to Kowalski & Associates for trust/estate work. Closed — referral complete.",
    },
    {
        "id": "seed-mt07",
        "client_id": "seed-cl04",
        "name": "Okafor — Stepparent Adoption",
        "matter_number": "2026-FL-002",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 275.0,
        "keywords": ["okafor", "adoption", "stepparent"],
        "key_people": [
            {"name": "Michael Okafor", "role": "Stepfather / Petitioner"},
            {"name": "Aiden Brooks (age 6)", "role": "Child"},
            {"name": "Hon. Sandra Liu", "role": "Judge"},
            {"name": "CASA Volunteer: Janet Moore", "role": "Guardian ad Litem"},
        ],
        "team_members": [
            {"name": "David Park", "role": "Lead Attorney"},
            {"name": "Rachel Torres", "role": "Paralegal"},
        ],
        "notes": "Biological father's parental rights terminated 2024. Home study completed 2/2026.",
    },
    {
        "id": "seed-mt08",
        "client_id": "seed-cl04",
        "name": "Okafor — Name Change Petition",
        "matter_number": "2026-FL-003",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 275.0,
        "keywords": ["okafor", "name change"],
        "key_people": [
            {"name": "Hon. Sandra Liu", "role": "Judge"},
        ],
        "team_members": [
            {"name": "David Park", "role": "Lead Attorney"},
        ],
        "notes": "Name change for Aiden to match adoptive family surname. Filed concurrent with adoption.",
    },
    {
        "id": "seed-mt09",
        "client_id": "seed-cl05",
        "name": "Whitfield v. Whitfield — Dissolution",
        "matter_number": "2026-FL-004",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 350.0,
        "keywords": ["whitfield", "dissolution", "divorce", "property"],
        "key_people": [
            {"name": "Karen Whitfield", "role": "Respondent"},
            {"name": "Steven Kessler, Esq.", "role": "Opposing Counsel (Kessler & Pratt)"},
            {"name": "Hon. Patricia Reeves", "role": "Judge"},
        ],
        "team_members": [
            {"name": "Sarah Mitchell", "role": "Lead Attorney"},
            {"name": "David Park", "role": "Associate"},
            {"name": "Rachel Torres", "role": "Paralegal"},
        ],
        "notes": "Complex property division — 2 rental properties, pension (PERA), 401(k). Valuations pending.",
    },
    {
        "id": "seed-mt10",
        "client_id": "seed-cl05",
        "name": "Whitfield — QDRO / Retirement Division",
        "matter_number": "2026-FL-005",
        "status": "active",
        "practice_area": "family",
        "billing_type": "hourly",
        "hourly_rate": 350.0,
        "keywords": ["whitfield", "qdro", "retirement", "pension", "401k"],
        "key_people": [
            {"name": "Karen Whitfield", "role": "Respondent"},
            {"name": "Steven Kessler, Esq.", "role": "Opposing Counsel"},
            {"name": "Robert Vance, CPA", "role": "Forensic Accountant"},
        ],
        "team_members": [
            {"name": "Sarah Mitchell", "role": "Lead Attorney"},
            {"name": "Rachel Torres", "role": "Paralegal"},
        ],
        "notes": "QDRO needed for Fidelity 401(k) and PERA pension. Vance retained for coverture fraction analysis.",
    },
]

# ---------------------------------------------------------------------------
# Sessions & Activities — 7 days (2026-03-21 to 2026-03-27)
# ---------------------------------------------------------------------------
# Each session: (session_id, date, start_h, start_m, end_h, end_m, summary)
# Each activity: (session_id, matter_id, app, context, minutes, narrative, activity_code, start_h, start_m, end_h, end_m)

NON_BILLABLE = {"nb-admin", "nb-cle", "nb-bizdev", "nb-probono"}

SESSIONS = []
ACTIVITIES = []

def _s(sid, date, sh, sm, eh, em, summary):
    SESSIONS.append((sid, date, sh, sm, eh, em, summary))

def _a(sid, mid, app, ctx, mins, narr, code, sh, sm, eh, em):
    ACTIVITIES.append((sid, mid, app, ctx, mins, narr, code, sh, sm, eh, em))


# ── Saturday 3/21 — light weekend work ──────────────────────────────────
_s("seed-s01", "2026-03-21", 9, 0, 10, 0,
   "Caught up on client emails and reviewed Thompson financial disclosures.")

_a("seed-s01", "seed-mt01", "Outlook",
   "RE: Thompson v. Thompson — Financial Disclosure Deadline Extension",
   18, "Reviewed and responded to opposing counsel's request for extension of financial disclosure deadline; conferred with client via email regarding same",
   "A102", 9, 0, 9, 18)
_a("seed-s01", "seed-mt01", "Adobe Acrobat",
   "Thompson_Robert_Financial_Affidavit_2026.pdf",
   24, "Reviewed respondent's preliminary financial affidavit for completeness and accuracy; identified discrepancies in reported business income",
   "A104", 9, 18, 9, 42)
_a("seed-s01", "seed-mt03", "Outlook",
   "Ramirez, Carlos — Mediation Scheduling",
   18, "Exchanged emails with mediator Dr. Simmons' office to confirm mediation date of 3/25; forwarded confirmation to client",
   "A102", 9, 42, 10, 0)

_s("seed-s02", "2026-03-21", 14, 0, 15, 0,
   "Researched relocation case law for Ramirez custody modification.")

_a("seed-s02", "seed-mt03", "Westlaw",
   "Search: Colorado relocation custody modification C.R.S. 14-10-129",
   36, "Researched Colorado relocation statutes and recent appellate decisions regarding custody modification when custodial parent moves out of state without court approval",
   "A104", 14, 0, 14, 36)
_a("seed-s02", "seed-mt03", "Microsoft Word",
   "Ramirez_Relocation_Research_Memo.docx",
   24, "Drafted internal research memorandum summarizing key holdings from In re Marriage of Ciesluk and progeny regarding best-interest factors in relocation cases",
   "A103", 14, 36, 15, 0)


# ── Sunday 3/22 — brief document review ─────────────────────────────────
_s("seed-s03", "2026-03-22", 10, 0, 11, 30,
   "Reviewed Chen prenup draft and Okafor home study report.")

_a("seed-s03", "seed-mt05", "Microsoft Word",
   "Chen_Nguyen_Prenuptial_Agreement_v2.docx",
   42, "Reviewed and revised prenuptial agreement draft sections regarding treatment of pre-marital tech stock holdings and future appreciation; added sunset clause per client instructions",
   "A103", 10, 0, 10, 42)
_a("seed-s03", "seed-mt07", "Adobe Acrobat",
   "Okafor_HomeStudy_Report_Feb2026.pdf",
   30, "Reviewed home study report prepared by CASA; noted favorable findings regarding stepfather's relationship with child and household stability",
   "A104", 10, 42, 11, 12)
_a("seed-s03", "seed-mt07", "Outlook",
   "Grace Okafor — Home Study Results",
   18, "Email to client summarizing positive home study findings and outlining next steps for adoption petition filing",
   "A102", 11, 12, 11, 30)


# ── Monday 3/23 — busy court day ────────────────────────────────────────
_s("seed-s04", "2026-03-23", 7, 45, 9, 30,
   "Prepared for Thompson temporary custody hearing.")

_a("seed-s04", "seed-mt02", "Microsoft Word",
   "Thompson_Motion_TempCustody_v3.docx",
   36, "Finalized motion for modification of temporary custody orders; incorporated updated school attendance records and therapist's letter",
   "A103", 7, 45, 8, 21)
_a("seed-s04", "seed-mt02", "Westlaw",
   "Search: temporary custody modification standard Colorado best interest",
   30, "Researched standard for modification of temporary custody orders; confirmed burden of proof requirements under C.R.S. 14-10-129(2)",
   "A104", 8, 21, 8, 51)
_a("seed-s04", "seed-mt02", "Clio",
   "Matter: Thompson — Temp Custody | Documents",
   24, "Organized exhibits for hearing including school records, therapist correspondence, and proposed parenting schedule",
   "L140", 8, 51, 9, 15)
_a("seed-s04", "seed-mt02", "Outlook",
   "Jennifer Thompson — Hearing Prep Reminders",
   15, "Sent client final preparation email with courtroom logistics, dress code reminders, and summary of key points for testimony",
   "A102", 9, 15, 9, 30)

_s("seed-s05", "2026-03-23", 9, 45, 11, 45,
   "Attended Thompson temporary custody hearing before Judge Reeves.")

_a("seed-s05", "seed-mt02", "Zoom",
   "Hearing: Thompson v. Thompson — Dept. 4, Hon. Patricia Reeves",
   90, "Appeared before Hon. Reeves for hearing on motion to modify temporary custody orders; examined client and cross-examined respondent regarding parenting time compliance; court took matter under advisement",
   "L440", 9, 45, 11, 15)
_a("seed-s05", "seed-mt02", "Microsoft Word",
   "Thompson_Hearing_Notes_032326.docx",
   30, "Prepared detailed post-hearing memorandum summarizing testimony, court's questions, and anticipated ruling timeline; identified follow-up items",
   "A103", 11, 15, 11, 45)

_s("seed-s06", "2026-03-23", 12, 30, 14, 30,
   "Worked on Ramirez custody case and Chen prenup communications.")

_a("seed-s06", "seed-mt03", "Outlook",
   "RE: Ramirez v. Dawson — Parenting Plan Proposal",
   18, "Reviewed and responded to opposing counsel's proposed parenting plan; identified three provisions inconsistent with client's position on holiday schedule",
   "A102", 12, 30, 12, 48)
_a("seed-s06", "seed-mt03", "Microsoft Word",
   "Ramirez_Proposed_Parenting_Plan_v2.docx",
   42, "Drafted counter-proposal for parenting plan addressing transportation arrangements for interstate visitation and allocation of travel costs",
   "A103", 12, 48, 13, 30)
_a("seed-s06", "seed-mt05", "iMessage",
   "Lisa Chen — prenup revision questions",
   12, "Brief text exchange with client regarding questions about intellectual property clause in prenuptial agreement; confirmed follow-up call for Thursday",
   "A102", 13, 30, 13, 42)
_a("seed-s06", "seed-mt05", "Microsoft Word",
   "Chen_Nguyen_Prenuptial_Agreement_v2.docx",
   30, "Revised intellectual property provisions in prenuptial agreement to address client's unvested RSUs and stock option grants",
   "A103", 13, 42, 14, 12)
_a("seed-s06", "nb-admin", "Clio",
   "Clio — Time & Billing Review",
   18, "Reviewed and approved outstanding time entries from prior week; generated preliminary invoices for Thompson and Ramirez matters",
   "A104", 14, 12, 14, 30)

_s("seed-s07", "2026-03-23", 14, 45, 16, 15,
   "Okafor adoption work and Whitfield initial case review.")

_a("seed-s07", "seed-mt07", "Chrome",
   "Colorado Courts E-Filing | Okafor Stepparent Adoption",
   18, "Reviewed e-filing requirements and checked status of background check clearance for stepparent adoption petition",
   "A106", 14, 45, 15, 3)
_a("seed-s07", "seed-mt07", "Microsoft Word",
   "Okafor_Adoption_Petition_Draft.docx",
   36, "Drafted petition for stepparent adoption; incorporated home study findings and attached exhibits including terminated parental rights order",
   "A103", 15, 3, 15, 39)
_a("seed-s07", "seed-mt09", "Adobe Acrobat",
   "Whitfield_Property_Appraisals_Bundle.pdf",
   36, "Initial review of property appraisals for two rental properties at 4th Ave and Wadsworth; noted $85K discrepancy between competing valuations",
   "A104", 15, 39, 16, 15)

_s("seed-s08", "2026-03-23", 16, 30, 17, 30,
   "End-of-day administrative tasks and email follow-up.")

_a("seed-s08", "nb-admin", "Outlook",
   "Firm Admin — Calendar Review & Deadlines",
   24, "Reviewed calendar for upcoming deadlines; updated statute of limitations tracker; confirmed courtroom availability for April hearings",
   "A104", 16, 30, 16, 54)
_a("seed-s08", "seed-mt01", "Outlook",
   "RE: Thompson — Discovery Responses Due 4/1",
   18, "Sent reminder to paralegal regarding upcoming discovery response deadline; outlined documents still needed from client",
   "A102", 16, 54, 17, 12)
_a("seed-s08", "nb-admin", "Clio",
   "Clio — Conflict Check: New Intake",
   18, "Ran conflict check for potential new client referral; no conflicts identified",
   "L100", 17, 12, 17, 30)


# ── Tuesday 3/24 — discovery & meetings ──────────────────────────────────
_s("seed-s09", "2026-03-24", 8, 0, 10, 0,
   "Discovery work for Whitfield dissolution — financial document review.")

_a("seed-s09", "seed-mt09", "Adobe Acrobat",
   "Whitfield_Bank_Statements_2024-2025.pdf",
   48, "Reviewed two years of bank statements for joint and individual accounts; flagged suspicious transfers totaling $42,000 to unidentified accounts in months preceding separation",
   "L310", 8, 0, 8, 48)
_a("seed-s09", "seed-mt09", "Microsoft Word",
   "Whitfield_Discovery_Requests_Set2.docx",
   42, "Drafted second set of interrogatories and requests for production targeting respondent's undisclosed financial accounts and cryptocurrency holdings",
   "L310", 8, 48, 9, 30)
_a("seed-s09", "seed-mt10", "Westlaw",
   "Search: QDRO requirements Colorado PERA pension division",
   30, "Researched QDRO requirements specific to Colorado PERA defined benefit pension; reviewed plan administrator's model order language",
   "A104", 9, 30, 10, 0)

_s("seed-s10", "2026-03-24", 10, 15, 11, 30,
   "Client meeting with Okafor regarding adoption timeline.")

_a("seed-s10", "seed-mt07", "Zoom",
   "Client Meeting: Grace & Michael Okafor — Adoption Status",
   54, "Videoconference with clients to review adoption petition draft, discuss court timeline, and prepare for finalization hearing; addressed client questions regarding post-adoption birth certificate process",
   "A101", 10, 15, 11, 9)
_a("seed-s10", "seed-mt07", "Microsoft Word",
   "Okafor_Meeting_Notes_032426.docx",
   21, "Documented meeting notes and action items; updated case timeline with anticipated filing date and hearing schedule",
   "A103", 11, 9, 11, 30)

_s("seed-s11", "2026-03-24", 13, 0, 14, 30,
   "Thompson deposition preparation — financial disclosure documents.")

_a("seed-s11", "seed-mt01", "Adobe Acrobat",
   "Thompson_Robert_Business_Tax_Returns_2023-2025.pdf",
   36, "Reviewed respondent's business tax returns in preparation for deposition; identified inconsistencies between reported income and lifestyle expenditures",
   "L330", 13, 0, 13, 36)
_a("seed-s11", "seed-mt01", "Microsoft Word",
   "Thompson_Deposition_Outline_RThompson.docx",
   36, "Prepared deposition outline for examination of Robert Thompson regarding business valuation, hidden income, and dissipation of marital assets",
   "L330", 13, 36, 14, 12)
_a("seed-s11", "seed-mt01", "Outlook",
   "James Hadley — Deposition Scheduling",
   18, "Correspondence with opposing counsel regarding scheduling of respondent's deposition; proposed dates in April",
   "A102", 14, 12, 14, 30)

_s("seed-s12", "2026-03-24", 14, 45, 16, 0,
   "CLE webinar on custody evaluation best practices.")

_a("seed-s12", "nb-cle", "Chrome",
   "CBA Webinar: Best Practices in Custody Evaluations — Dr. Sarah Hendricks",
   60, "Attended Colorado Bar Association CLE webinar on current best practices in custody evaluations; focus on psychological testing protocols and parental alienation assessment",
   "A101", 14, 45, 15, 45)
_a("seed-s12", "nb-admin", "Outlook",
   "Firm Admin — CLE Credit Submission",
   15, "Submitted CLE attendance certificate to Colorado Supreme Court; updated firm CLE tracking spreadsheet",
   "A106", 15, 45, 16, 0)

_s("seed-s13", "2026-03-24", 16, 15, 17, 15,
   "Ramirez contempt motion follow-up and Whitfield property research.")

_a("seed-s13", "seed-mt04", "Microsoft Word",
   "Ramirez_Contempt_Motion_Exhibits.docx",
   30, "Compiled and organized exhibits for contempt motion including text message screenshots, calendar entries documenting missed visitation, and school pickup records",
   "L140", 16, 15, 16, 45)
_a("seed-s13", "seed-mt09", "Chrome",
   "Denver County Assessor — Property Records Search",
   30, "Reviewed county assessor records for Whitfield rental properties; downloaded current tax assessments and ownership history for use in property division analysis",
   "L110", 16, 45, 17, 15)


# ── Wednesday 3/25 — mediation day ──────────────────────────────────────
_s("seed-s14", "2026-03-25", 7, 30, 9, 0,
   "Prepared for Ramirez mediation — strategy review and document assembly.")

_a("seed-s14", "seed-mt03", "Microsoft Word",
   "Ramirez_Mediation_Brief_Confidential.docx",
   36, "Finalized confidential mediation brief outlining client's position on custody, proposed parenting schedule, and settlement parameters for relocation dispute",
   "A103", 7, 30, 8, 6)
_a("seed-s14", "seed-mt03", "Clio",
   "Matter: Ramirez v. Dawson — Mediation Prep",
   24, "Assembled mediation binder with custody evaluation excerpts, school records, and proposed parenting plan; reviewed prior offers and counteroffers",
   "L160", 8, 6, 8, 30)
_a("seed-s14", "seed-mt03", "Outlook",
   "Carlos Ramirez — Mediation Preparation Call",
   30, "Telephone conference with client to review mediation strategy, discuss settlement parameters, and prepare for opening statement; counseled on realistic expectations",
   "A102", 8, 30, 9, 0)

_s("seed-s15", "2026-03-25", 9, 30, 12, 30,
   "Attended mediation in Ramirez v. Dawson custody dispute.")

_a("seed-s15", "seed-mt03", "Zoom",
   "Mediation: Ramirez v. Dawson — Dr. Patricia Simmons, Mediator",
   150, "Attended three-hour mediation session with client; negotiated custody modification terms including revised holiday schedule, summer parenting time, and transportation cost-sharing; parties reached partial agreement on school-year custody but impasse on summer schedule",
   "L160", 9, 30, 12, 0)
_a("seed-s15", "seed-mt03", "Microsoft Word",
   "Ramirez_Mediation_Summary_032526.docx",
   30, "Drafted post-mediation summary of agreed terms and remaining disputed issues; outlined next steps including follow-up session scheduled for 4/8",
   "A103", 12, 0, 12, 30)

_s("seed-s16", "2026-03-25", 13, 30, 15, 0,
   "Post-mediation follow-up and Okafor name change petition work.")

_a("seed-s16", "seed-mt03", "Outlook",
   "Carlos Ramirez — Mediation Debrief",
   18, "Follow-up email to client summarizing mediation outcomes, explaining partial agreement terms, and outlining remaining contested issues for potential second session",
   "A102", 13, 30, 13, 48)
_a("seed-s16", "seed-mt03", "Outlook",
   "Linda Cho, Esq. — Ramirez Mediation Follow-Up",
   12, "Email to opposing counsel confirming agreed terms from mediation and proposing timeline for drafting stipulated partial agreement",
   "A102", 13, 48, 14, 0)
_a("seed-s16", "seed-mt08", "Microsoft Word",
   "Okafor_NameChange_Petition.docx",
   36, "Drafted verified petition for change of name for minor child; included statutory basis, reasons for name change, and consent of adoptive parents",
   "A103", 14, 0, 14, 36)
_a("seed-s16", "seed-mt08", "Chrome",
   "Colorado Courts E-Filing | Name Change Petition",
   24, "E-filed name change petition with Denver District Court; confirmed acceptance and downloaded filed-stamped copy for client file",
   "A106", 14, 36, 15, 0)

_s("seed-s17", "2026-03-25", 15, 15, 17, 0,
   "Whitfield property settlement drafting and Thompson discovery review.")

_a("seed-s17", "seed-mt09", "Microsoft Word",
   "Whitfield_Property_Settlement_Agreement_v1.docx",
   48, "Began drafting property settlement agreement addressing division of rental properties, personal property, and retirement accounts; included provisions for sale of 4th Ave property",
   "A103", 15, 15, 16, 3)
_a("seed-s17", "seed-mt01", "Adobe Acrobat",
   "Thompson_Discovery_Responses_Set1.pdf",
   30, "Reviewed respondent's first set of discovery responses; noted deficient responses to interrogatories 4, 7, and 12 regarding business income and asset transfers",
   "L310", 16, 3, 16, 33)
_a("seed-s17", "seed-mt01", "Outlook",
   "James Hadley — Deficient Discovery Responses",
   27, "Drafted meet-and-confer letter to opposing counsel regarding deficient discovery responses; detailed specific deficiencies and requested supplementation within 14 days",
   "A102", 16, 33, 17, 0)


# ── Thursday 3/26 — drafting day ─────────────────────────────────────────
_s("seed-s18", "2026-03-26", 8, 0, 10, 0,
   "Continued Whitfield property settlement drafting and QDRO research.")

_a("seed-s18", "seed-mt09", "Microsoft Word",
   "Whitfield_Property_Settlement_Agreement_v1.docx",
   48, "Continued drafting property settlement agreement; completed sections on retirement account division including PERA pension and Fidelity 401(k) provisions",
   "A103", 8, 0, 8, 48)
_a("seed-s18", "seed-mt10", "Westlaw",
   "Search: QDRO domestic relations order 401k plan Fidelity model language",
   36, "Researched model QDRO language for Fidelity 401(k) plans; reviewed plan's QDRO procedures and determination letter requirements",
   "A104", 8, 48, 9, 24)
_a("seed-s18", "seed-mt10", "Microsoft Word",
   "Whitfield_QDRO_Draft_401k.docx",
   36, "Began drafting QDRO for Fidelity 401(k) plan using plan administrator's model order as template; addressed coverture fraction calculation per forensic accountant's report",
   "A103", 9, 24, 10, 0)

_s("seed-s19", "2026-03-26", 10, 15, 11, 45,
   "Client call with Chen regarding prenup revisions and Ramirez case updates.")

_a("seed-s19", "seed-mt05", "Zoom",
   "Client Call: Lisa Chen — Prenuptial Agreement Review",
   48, "Telephone conference with client to review revised prenuptial agreement provisions regarding intellectual property, RSU vesting schedule treatment, and sunset clause; client approved revisions with minor changes to alimony waiver language",
   "A101", 10, 15, 11, 3)
_a("seed-s19", "seed-mt05", "Microsoft Word",
   "Chen_Nguyen_Prenuptial_Agreement_v3.docx",
   24, "Incorporated client's requested changes to alimony waiver provisions; prepared clean draft for circulation to fiance's independent counsel",
   "A103", 11, 3, 11, 27)
_a("seed-s19", "seed-mt04", "Outlook",
   "RE: Ramirez — Contempt Hearing Date",
   18, "Received and reviewed court's notice setting contempt hearing for 4/15/2026; calendared deadlines and sent notification to client",
   "A102", 11, 27, 11, 45)

_s("seed-s20", "2026-03-26", 13, 0, 14, 30,
   "Thompson discovery preparation and pro bono intake.")

_a("seed-s20", "seed-mt01", "Microsoft Word",
   "Thompson_Discovery_Responses_Set2_Draft.docx",
   42, "Drafted client's responses to respondent's second set of discovery requests; coordinated with client regarding responsive documents for production",
   "L310", 13, 0, 13, 42)
_a("seed-s20", "seed-mt01", "Outlook",
   "Jennifer Thompson — Document Request Follow-Up",
   18, "Email to client with detailed list of documents needed to complete discovery responses; set deadline of 3/30 for client document production",
   "A102", 13, 42, 14, 0)
_a("seed-s20", "nb-probono", "Zoom",
   "Pro Bono Intake: Colorado Legal Services Referral",
   30, "Conducted intake interview with potential pro bono client referred by Colorado Legal Services; preliminary assessment of domestic violence protective order matter; scheduled follow-up for conflict check",
   "A101", 14, 0, 14, 30)

_s("seed-s21", "2026-03-26", 14, 45, 16, 30,
   "Okafor adoption petition finalization and firm admin.")

_a("seed-s21", "seed-mt07", "Microsoft Word",
   "Okafor_Adoption_Petition_Final.docx",
   42, "Finalized stepparent adoption petition; incorporated guardian ad litem's recommendation letter and updated verification page with client signatures",
   "A103", 14, 45, 15, 27)
_a("seed-s21", "seed-mt07", "Adobe Acrobat",
   "Okafor_Adoption_Exhibits_Bundle.pdf",
   24, "Compiled and bookmarked exhibit bundle for adoption petition including home study, GAL report, terminated parental rights order, and consent forms",
   "L140", 15, 27, 15, 51)
_a("seed-s21", "seed-mt08", "Outlook",
   "Grace Okafor — Name Change & Adoption Filing Update",
   18, "Updated client on name change petition filing status and anticipated timeline for adoption petition filing; confirmed hearing date coordination with court clerk",
   "A102", 15, 51, 16, 9)
_a("seed-s21", "nb-admin", "Clio",
   "Clio — Monthly Billing Preparation",
   21, "Reviewed unbilled time entries across all active matters; flagged entries needing narrative revisions before March invoicing cycle",
   "A104", 16, 9, 16, 30)


# ── Friday 3/27 — today, wrap up week ───────────────────────────────────
_s("seed-s22", "2026-03-27", 8, 0, 9, 30,
   "Finalized Thompson temporary custody motion and filed with court.")

_a("seed-s22", "seed-mt02", "Microsoft Word",
   "Thompson_Motion_TempCustody_FINAL.docx",
   42, "Final review and revision of motion for modification of temporary custody orders incorporating evidence from Monday's hearing; added proposed order",
   "A103", 8, 0, 8, 42)
_a("seed-s22", "seed-mt02", "Chrome",
   "Colorado Courts E-Filing | Thompson v. Thompson — Case 2025-DR-4821",
   18, "E-filed motion for modification of temporary custody orders with proposed order; confirmed acceptance and served opposing counsel electronically",
   "A106", 8, 42, 9, 0)
_a("seed-s22", "seed-mt02", "Outlook",
   "Jennifer Thompson — Motion Filed Confirmation",
   12, "Notified client that motion was filed and served; explained anticipated timeline for court's ruling and possible hearing date",
   "A102", 9, 0, 9, 12)
_a("seed-s22", "seed-mt02", "Outlook",
   "James Hadley — Service Confirmation | Thompson Motion",
   18, "Sent courtesy copy of filed motion to opposing counsel with cover letter; requested available dates for any hearing if court sets oral argument",
   "A102", 9, 12, 9, 30)

_s("seed-s23", "2026-03-27", 9, 45, 11, 15,
   "Filed Okafor adoption petition and worked on Whitfield QDRO.")

_a("seed-s23", "seed-mt07", "Chrome",
   "Colorado Courts E-Filing | Okafor Stepparent Adoption Petition",
   24, "E-filed stepparent adoption petition with Denver District Court; uploaded all exhibits and paid filing fee; confirmed acceptance",
   "A106", 9, 45, 10, 9)
_a("seed-s23", "seed-mt07", "Outlook",
   "Grace Okafor — Adoption Petition Filed!",
   12, "Notified clients that adoption petition was successfully filed; provided case number and explained next steps for finalization hearing scheduling",
   "A102", 10, 9, 10, 21)
_a("seed-s23", "seed-mt10", "Microsoft Word",
   "Whitfield_QDRO_Draft_401k_v2.docx",
   36, "Revised QDRO draft for Fidelity 401(k) incorporating forensic accountant's updated coverture fraction analysis; addressed plan administrator's preliminary review comments",
   "A103", 10, 21, 10, 57)
_a("seed-s23", "seed-mt10", "Outlook",
   "Robert Vance, CPA — QDRO Coverture Fraction Confirmation",
   18, "Correspondence with forensic accountant to confirm coverture fraction methodology and request updated calculations reflecting most recent account statements",
   "A102", 10, 57, 11, 15)

_s("seed-s24", "2026-03-27", 12, 0, 13, 0,
   "Ramirez stipulated agreement drafting from mediation outcomes.")

_a("seed-s24", "seed-mt03", "Microsoft Word",
   "Ramirez_Dawson_Stipulated_Agreement_Partial.docx",
   42, "Drafted stipulated agreement memorializing terms agreed upon during 3/25 mediation regarding school-year custody arrangement and holiday schedule rotation",
   "A103", 12, 0, 12, 42)
_a("seed-s24", "seed-mt03", "Outlook",
   "Linda Cho, Esq. — Draft Stipulated Agreement for Review",
   18, "Transmitted draft stipulated partial agreement to opposing counsel for review and comment; requested response by 4/3",
   "A102", 12, 42, 13, 0)

_s("seed-s25", "2026-03-27", 14, 0, 15, 0,
   "Weekly billing review and business development planning.")

_a("seed-s25", "nb-admin", "Clio",
   "Clio — Weekly Time Entry Review & Invoicing",
   30, "Conducted weekly review of all attorney and paralegal time entries; approved entries for March billing cycle; generated and reviewed draft invoices for five active client matters",
   "A104", 14, 0, 14, 30)
_a("seed-s25", "nb-bizdev", "Chrome",
   "LinkedIn — Colorado Family Law Section Networking Event",
   18, "Reviewed attendee list for upcoming Colorado Bar Association Family Law Section networking luncheon; identified three potential referral sources to connect with",
   "A104", 14, 30, 14, 48)
_a("seed-s25", "nb-bizdev", "Microsoft Word",
   "Mitchell_Associates_CBA_Luncheon_Talking_Points.docx",
   12, "Prepared brief talking points for CBA Family Law Section networking luncheon regarding firm's custody and high-asset divorce practice areas",
   "A103", 14, 48, 15, 0)

_s("seed-s26", "2026-03-27", 15, 15, 16, 30,
   "End-of-week case review and next week planning.")

_a("seed-s26", "seed-mt09", "Microsoft Word",
   "Whitfield_Property_Settlement_Agreement_v2.docx",
   36, "Revised property settlement agreement incorporating updated rental property appraisal values; adjusted proposed distribution percentages per client instructions",
   "A103", 15, 15, 15, 51)
_a("seed-s26", "seed-mt05", "Outlook",
   "Karen Wells, Esq. — Chen Prenup Draft for Independent Review",
   12, "Transmitted revised prenuptial agreement to fiance's independent counsel for review; requested comments by 4/10",
   "A102", 15, 51, 16, 3)
_a("seed-s26", "nb-admin", "Outlook",
   "Firm Admin — Weekly Calendar & Deadline Review",
   27, "Reviewed upcoming deadlines and court dates for all active matters through 4/10; updated case management calendars and distributed weekly status report to team",
   "A104", 16, 3, 16, 30)


# ---------------------------------------------------------------------------
# UTBMS code → category mapping (matches backend/routes/activities.py)
# ---------------------------------------------------------------------------
def utbms_to_category(code: str | None) -> str:
    if not code:
        return "Administrative"
    prefix = code[0]
    try:
        num = int(code[1:])
    except ValueError:
        return "Administrative"
    if prefix == "L":
        if 100 <= num <= 190:
            return "Case Review"
        if 200 <= num <= 250:
            return "Document Drafting"
        if 300 <= num <= 340:
            return "Case Review"
        if 400 <= num <= 440:
            return "Court & Hearings"
        if 500 <= num <= 520:
            return "Court & Hearings"
    if prefix == "A":
        return {
            "A101": "Court & Hearings",
            "A102": "Client Communication",
            "A103": "Document Drafting",
            "A104": "Legal Research",
            "A106": "Administrative",
        }.get(code, "Administrative")
    return "Administrative"


# ---------------------------------------------------------------------------
# Rate resolution helper
# ---------------------------------------------------------------------------
# Build lookup tables once
_client_rates = {c["id"]: c["default_rate"] for c in CLIENTS}
_matter_map = {m["id"]: m for m in MATTERS}


def resolve_rate(matter_id: str | None) -> float | None:
    if not matter_id:
        return None
    if matter_id in NON_BILLABLE:
        return None
    m = _matter_map.get(matter_id)
    if not m:
        return None
    if m["billing_type"] == "non-billable":
        return None
    if m["hourly_rate"] is not None:
        return m["hourly_rate"]
    return _client_rates.get(m["client_id"])


def is_billable(matter_id: str | None) -> bool:
    if not matter_id:
        return True
    if matter_id in NON_BILLABLE:
        return False
    m = _matter_map.get(matter_id)
    if m and m["billing_type"] == "non-billable":
        return False
    return True


# ---------------------------------------------------------------------------
# Database operations
# ---------------------------------------------------------------------------
def get_db() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def clean(conn: sqlite3.Connection):
    """Remove all seed data."""
    conn.execute("DELETE FROM activities WHERE id LIKE 'seed-%' OR session_id LIKE 'seed-%'")
    conn.execute("DELETE FROM sessions WHERE id LIKE 'seed-%'")
    conn.execute("DELETE FROM matters WHERE id LIKE 'seed-%'")
    conn.execute("DELETE FROM clients WHERE id LIKE 'seed-%'")
    conn.commit()
    print("Cleaned all seed data.")


def seed(conn: sqlite3.Connection):
    """Insert all seed data."""
    now = "2026-03-27T12:00:00"

    # Check for existing seed data
    existing = conn.execute("SELECT COUNT(*) as cnt FROM clients WHERE id LIKE 'seed-%'").fetchone()
    if existing["cnt"] > 0:
        print("Seed data already exists. Use --clean first to re-seed.")
        return

    # Clients
    for c in CLIENTS:
        conn.execute(
            """INSERT INTO clients (id, name, contact_info, billing_address, default_rate, notes, is_internal, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (c["id"], c["name"], c["contact_info"], c["billing_address"],
             c["default_rate"], c["notes"], now, now),
        )
    print(f"  Created {len(CLIENTS)} clients")

    # Matters
    for m in MATTERS:
        conn.execute(
            """INSERT INTO matters (id, client_id, name, matter_number, status, practice_area,
               billing_type, hourly_rate, keywords, key_people, team_members, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (m["id"], m["client_id"], m["name"], m["matter_number"], m["status"],
             m["practice_area"], m["billing_type"], m["hourly_rate"],
             json.dumps(m["keywords"]), json.dumps(m["key_people"]),
             json.dumps(m["team_members"]), m["notes"], now, now),
        )
    print(f"  Created {len(MATTERS)} matters")

    # Sessions
    for sid, date, sh, sm, eh, em, summary in SESSIONS:
        start_time = f"{date}T{sh:02d}:{sm:02d}:00"
        end_time = f"{date}T{eh:02d}:{em:02d}:00"

        # Compute categories from this session's activities
        cat_minutes = defaultdict(int)
        for a_sid, a_mid, _, _, a_mins, _, a_code, *_ in ACTIVITIES:
            if a_sid == sid:
                cat = utbms_to_category(a_code)
                cat_minutes[cat] += a_mins

        total_mins = sum(cat_minutes.values()) or 1
        categories = [
            {"name": cat, "minutes": mins, "percentage": round(mins / total_mins * 100)}
            for cat, mins in sorted(cat_minutes.items(), key=lambda x: -x[1])
        ]

        conn.execute(
            """INSERT INTO sessions (id, start_time, end_time, status, summary, categories, activities, created_at)
               VALUES (?, ?, ?, 'completed', ?, ?, '[]', ?)""",
            (sid, start_time, end_time, summary, json.dumps(categories), now),
        )
    print(f"  Created {len(SESSIONS)} sessions")

    # Activities
    act_count = 0
    for i, (a_sid, a_mid, app, ctx, mins, narr, code, a_sh, a_sm, a_eh, a_em) in enumerate(ACTIVITIES):
        date = None
        for sid, sdate, *_ in SESSIONS:
            if sid == a_sid:
                date = sdate
                break

        act_id = f"seed-a{i+1:03d}"
        start_time = f"{date}T{a_sh:02d}:{a_sm:02d}:00"
        end_time = f"{date}T{a_eh:02d}:{a_em:02d}:00"
        category = utbms_to_category(code)
        billable = 1 if is_billable(a_mid) else 0
        rate = resolve_rate(a_mid)

        # Calculate sort_order within session
        sort_order = 0
        for j, (prev_sid, *_) in enumerate(ACTIVITIES[:i]):
            if prev_sid == a_sid:
                sort_order += 1

        conn.execute(
            """INSERT INTO activities (id, session_id, matter_id, app, context, minutes, narrative,
               category, billable, effective_rate, sort_order, start_time, end_time,
               activity_code, approval_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (act_id, a_sid, a_mid, app, ctx, mins, narr, category, billable, rate,
             sort_order, start_time, end_time, code, now),
        )
        act_count += 1
    print(f"  Created {act_count} activities")

    conn.commit()
    print("\nDone! Open TimeTrack and browse dates 2026-03-21 through 2026-03-27.")


def main():
    parser = argparse.ArgumentParser(description="Seed family law firm data into TimeTrack")
    parser.add_argument("--clean", action="store_true", help="Remove all seeded data")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Start the TimeTrack app at least once first to initialize the database.")
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
