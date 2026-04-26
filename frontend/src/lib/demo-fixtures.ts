/**
 * Demo mode fixtures: realistic family law practice data.
 * Used by api-web-demo.ts when ?demo URL param is active.
 *
 * Mirrors the SQL in supabase/seed-demo.sql but generates sessions/activities
 * relative to today so the demo always feels current.
 */
import type { Client, Matter, Session, Activity } from './types'

// ─── Clients ──────────────────────────────────────────────────────────────

export const DEMO_CLIENTS: Client[] = [
  {
    id: 'cl-internal',
    name: 'Firm / Internal',
    contact_info: null,
    billing_address: null,
    default_rate: null,
    notes: 'Non-billable internal matters (admin, CLE, biz dev, pro bono).',
    is_internal: true,
  },
  {
    id: 'cl-mart',
    name: 'Martinez, Roberto & Elena',
    contact_info: 'roberto.martinez@gmail.com | (415) 555-2847',
    billing_address: '1842 Pacific Heights Blvd, San Francisco, CA 94115',
    default_rate: 450,
    notes:
      'High-asset divorce — contested property division, two minor children (ages 8, 12). Roberto is a tech executive at Stripe, Elena is a physician at UCSF. Complex stock option and RSU valuation issues. Referred by David Chen at Morrison Foerster.',
    is_internal: false,
  },
  {
    id: 'cl-thom',
    name: 'Thompson, Jessica',
    contact_info: 'jthompson@outlook.com | (510) 555-9134',
    billing_address: '2205 Hillegass Ave, Berkeley, CA 94704',
    default_rate: 375,
    notes:
      'Seeking custody modification after ex-husband announced relocation to Portland. Two children (ages 5, 9). Amicable co-parenting relationship until relocation issue. Works as a high school teacher.',
    is_internal: false,
  },
  {
    id: 'cl-chen',
    name: 'Chen, David & Williams, Sarah',
    contact_info: 'david.chen@gmail.com | (415) 555-6203',
    billing_address: '580 Bush St, Apt 1204, San Francisco, CA 94108',
    default_rate: 400,
    notes:
      'Pre-marital couple — David is a software engineer at Google, Sarah is a product manager at Figma. Both have significant pre-marital assets and stock options. Wedding planned for September 2026.',
    is_internal: false,
  },
  {
    id: 'cl-okaf',
    name: 'Okafor, Nkem & Adaeze',
    contact_info: 'nokafor@yahoo.com | (925) 555-4718',
    billing_address: '3847 Blackhawk Dr, Danville, CA 94506',
    default_rate: 350,
    notes:
      "International adoption from Nigeria — adopting Nkem's 6-year-old niece after her parents passed away. Nkem is a US citizen, originally from Lagos. Complex immigration and Hague Convention considerations.",
    is_internal: false,
  },
  {
    id: 'cl-davi',
    name: 'Davis, Rachel',
    contact_info: 'rachel.d.secure@protonmail.com | (408) 555-3291',
    billing_address: 'Address withheld — safety concerns',
    default_rate: 375,
    notes:
      'Domestic violence survivor seeking DVRO and emergency custody. Fled marital home with two children (ages 3, 7). Currently in a confidential shelter. Husband is a corporate attorney. HIGH PRIORITY — safety risk.',
    is_internal: false,
  },
  {
    id: 'cl-pate',
    name: 'Patel, Amit',
    contact_info: 'amit.patel.esq@gmail.com | (650) 555-8456',
    billing_address: '1120 Hamilton Ave, Palo Alto, CA 94301',
    default_rate: 350,
    notes:
      "Seeking child support modification — lost senior engineering position at Meta during layoffs, now consulting at reduced income. Two children (ages 10, 14) from prior marriage. Ex-wife is an anesthesiologist.",
    is_internal: false,
  },
]

// ─── Matters ──────────────────────────────────────────────────────────────

export const DEMO_MATTERS: Matter[] = [
  // Non-billable internal matters
  {
    id: 'nb-admin',
    client_id: 'cl-internal',
    name: 'Administrative',
    matter_number: null,
    status: 'active',
    practice_area: null,
    billing_type: 'non-billable',
    hourly_rate: null,
    keywords: ['calendar', 'outlook', 'billing', 'expense', 'admin'],
    key_people: [],
    team_members: [],
    notes: null,
  },
  {
    id: 'nb-cle',
    client_id: 'cl-internal',
    name: 'CLE / Training',
    matter_number: null,
    status: 'active',
    practice_area: null,
    billing_type: 'non-billable',
    hourly_rate: null,
    keywords: ['cle', 'training', 'seminar'],
    key_people: [],
    team_members: [],
    notes: null,
  },
  {
    id: 'nb-bizdev',
    client_id: 'cl-internal',
    name: 'Business Development',
    matter_number: null,
    status: 'active',
    practice_area: null,
    billing_type: 'non-billable',
    hourly_rate: null,
    keywords: ['business dev', 'marketing', 'pitch', 'linkedin'],
    key_people: [],
    team_members: [],
    notes: null,
  },
  {
    id: 'nb-probono',
    client_id: 'cl-internal',
    name: 'Pro Bono',
    matter_number: null,
    status: 'active',
    practice_area: null,
    billing_type: 'non-billable',
    hourly_rate: null,
    keywords: ['pro bono', 'legal aid'],
    key_people: [],
    team_members: [],
    notes: null,
  },
  // Billable matters
  {
    id: 'mt-mart-1',
    client_id: 'cl-mart',
    name: 'Dissolution of Marriage',
    matter_number: '2026-FL-001',
    status: 'active',
    practice_area: 'Family Law — Divorce',
    billing_type: 'hourly',
    hourly_rate: 450,
    keywords: ['martinez', 'dissolution', 'divorce', 'community property', 'asset division', 'RSU', 'stock options'],
    key_people: [
      { name: 'Roberto Martinez', role: 'Petitioner' },
      { name: 'Elena Martinez', role: 'Respondent' },
      { name: 'James Whitfield', role: 'Opposing Counsel — Whitfield & Associates' },
    ],
    team_members: [
      { name: 'Sarah Kim', role: 'Paralegal' },
      { name: 'Michael Torres', role: 'Forensic Accountant — BDO' },
    ],
    notes: 'Filed Jan 2026. Contested — major disputes over Stripe RSU vesting schedule and UCSF pension. Discovery phase.',
  },
  {
    id: 'mt-mart-2',
    client_id: 'cl-mart',
    name: 'Child Custody & Parenting Plan',
    matter_number: '2026-FL-002',
    status: 'active',
    practice_area: 'Family Law — Custody',
    billing_type: 'hourly',
    hourly_rate: 450,
    keywords: ['martinez', 'custody', 'parenting plan', 'visitation', 'best interest', 'child'],
    key_people: [
      { name: 'Roberto Martinez', role: 'Father' },
      { name: 'Elena Martinez', role: 'Mother' },
      { name: 'Dr. Lisa Park', role: 'Custody Evaluator' },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: 'Both parents want primary custody. Custody evaluation ordered by court — Dr. Park conducting 730 evaluation.',
  },
  {
    id: 'mt-mart-3',
    client_id: 'cl-mart',
    name: 'Property Division — Business Valuation',
    matter_number: '2026-FL-009',
    status: 'active',
    practice_area: 'Family Law — Divorce',
    billing_type: 'hourly',
    hourly_rate: 450,
    keywords: ['martinez', 'property division', 'business valuation', 'RSU', 'stock options', 'pension', 'QDRO'],
    key_people: [
      { name: 'Michael Torres', role: 'Forensic Accountant — BDO' },
      { name: 'James Whitfield', role: 'Opposing Counsel' },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: 'Tracing Stripe RSUs — need to determine community vs. separate property characterization. UCSF pension requires QDRO.',
  },
  {
    id: 'mt-thom-1',
    client_id: 'cl-thom',
    name: 'Custody Modification',
    matter_number: '2026-FL-003',
    status: 'active',
    practice_area: 'Family Law — Custody',
    billing_type: 'hourly',
    hourly_rate: 375,
    keywords: ['thompson', 'custody modification', 'relocation', 'move-away', 'best interest'],
    key_people: [
      { name: 'Jessica Thompson', role: 'Petitioner (Mother)' },
      { name: 'Mark Thompson', role: 'Respondent (Father)' },
      { name: 'Linda Chow', role: 'Opposing Counsel' },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: 'Father wants to relocate to Portland for a new job at Nike. Mother opposes — children are established in Berkeley schools.',
  },
  {
    id: 'mt-thom-2',
    client_id: 'cl-thom',
    name: 'Relocation Request Response',
    matter_number: '2026-FL-010',
    status: 'active',
    practice_area: 'Family Law — Custody',
    billing_type: 'hourly',
    hourly_rate: 375,
    keywords: ['thompson', 'relocation', 'move-away', 'LaMusga factors', 'opposition'],
    key_people: [
      { name: 'Mark Thompson', role: 'Moving Party' },
      { name: 'Linda Chow', role: 'Opposing Counsel' },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: "Responding to Mark's formal relocation request. Analyzing LaMusga factors — stability of current arrangement is strong.",
  },
  {
    id: 'mt-chen-1',
    client_id: 'cl-chen',
    name: 'Prenuptial Agreement',
    matter_number: '2026-FL-004',
    status: 'active',
    practice_area: 'Family Law — Prenup',
    billing_type: 'hourly',
    hourly_rate: 400,
    keywords: ['chen', 'williams', 'prenuptial', 'prenup', 'premarital agreement', 'separate property'],
    key_people: [
      { name: 'David Chen', role: 'Client — Fiancé' },
      { name: 'Sarah Williams', role: 'Client — Fiancée' },
      { name: 'Rebecca Stein', role: 'Independent Counsel for Sarah' },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: 'Both parties have significant pre-marital tech stock. Need to address unvested RSUs, future appreciation, and potential spousal support waiver. Collaborative approach — both want fairness.',
  },
  {
    id: 'mt-okaf-1',
    client_id: 'cl-okaf',
    name: 'International Adoption',
    matter_number: '2026-FL-005',
    status: 'active',
    practice_area: 'Family Law — Adoption',
    billing_type: 'hourly',
    hourly_rate: 350,
    keywords: ['okafor', 'adoption', 'international', 'Nigeria', 'Hague Convention', 'USCIS', 'I-600', 'immigration'],
    key_people: [
      { name: 'Nkem Okafor', role: 'Petitioner (Uncle)' },
      { name: 'Adaeze Okafor', role: 'Petitioner (Aunt)' },
      { name: 'Chioma Okafor', role: 'Child (age 6)' },
      { name: 'Agent Pham', role: 'USCIS Officer' },
    ],
    team_members: [
      { name: 'Sarah Kim', role: 'Paralegal' },
      { name: 'Patricia Ngozi', role: 'Nigerian Counsel — Lagos' },
    ],
    notes: 'Orphan petition — I-600 filing. Home study approved. Awaiting USCIS I-171H approval. Nigerian court order for custody obtained.',
  },
  {
    id: 'mt-davi-1',
    client_id: 'cl-davi',
    name: 'Protective Order (DVRO)',
    matter_number: '2026-FL-006',
    status: 'active',
    practice_area: 'Family Law — Domestic Violence',
    billing_type: 'hourly',
    hourly_rate: 375,
    keywords: ['davis', 'DVRO', 'protective order', 'restraining order', 'domestic violence', 'TRO'],
    key_people: [
      { name: 'Rachel Davis', role: 'Petitioner' },
      { name: 'Gregory Davis', role: 'Respondent' },
      { name: 'Officer Reyes', role: 'Reporting Officer — SJPD' },
    ],
    team_members: [
      { name: 'Sarah Kim', role: 'Paralegal' },
      { name: 'Maria Santos', role: 'DV Advocate — Next Door Solutions' },
    ],
    notes: 'TRO granted March 5. DVRO hearing scheduled for April 2. Pattern of coercive control and two documented physical incidents. Police report on file.',
  },
  {
    id: 'mt-davi-2',
    client_id: 'cl-davi',
    name: 'Emergency Custody',
    matter_number: '2026-FL-007',
    status: 'active',
    practice_area: 'Family Law — Custody',
    billing_type: 'hourly',
    hourly_rate: 375,
    keywords: ['davis', 'emergency custody', 'ex parte', 'temporary custody', 'child safety'],
    key_people: [
      { name: 'Rachel Davis', role: 'Petitioner' },
      { name: 'Gregory Davis', role: 'Respondent' },
      { name: 'Dr. Amanda Chen', role: "Children's Therapist" },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: 'Ex parte motion for temporary sole custody granted March 10. Children (3, 7) in therapy. Supervised visitation only per court order.',
  },
  {
    id: 'mt-pate-1',
    client_id: 'cl-pate',
    name: 'Child Support Modification',
    matter_number: '2026-FL-008',
    status: 'active',
    practice_area: 'Family Law — Support',
    billing_type: 'hourly',
    hourly_rate: 350,
    keywords: ['patel', 'child support', 'modification', 'income change', 'guideline support', 'imputed income'],
    key_people: [
      { name: 'Amit Patel', role: 'Petitioner (Father)' },
      { name: 'Dr. Priya Sharma', role: 'Respondent (Mother)' },
      { name: 'Karen West', role: 'Opposing Counsel — West Family Law' },
    ],
    team_members: [{ name: 'Sarah Kim', role: 'Paralegal' }],
    notes: "Amit's W-2 income dropped from $285K to $120K consulting. Opposing counsel arguing income should be imputed at prior level. Need to demonstrate good-faith job search and market conditions.",
  },
]

// ─── Session / Activity templates ─────────────────────────────────────────

interface ActivityTemplate {
  matter_id: string
  app: string
  context: string
  minutes: number
  narrative: string
  category: string
  activity_code: string
}

interface SessionTemplate {
  hourOffset: number  // hours from start of work day (9am)
  durationMinutes: number
  matter_id: string
  summary: string
  activities: ActivityTemplate[]
}

// 5 days × 4 sessions/day = 20 sessions, ~50 activities
const SESSION_TEMPLATES_BY_DAY: SessionTemplate[][] = [
  // Day 0 (most recent — today)
  [
    {
      hourOffset: 0,
      durationMinutes: 90,
      matter_id: 'mt-mart-1',
      summary: 'Researched community property characterization of RSUs vesting during marriage. Reviewed In re Marriage of Hug and related precedent. Began drafting motion to compel production of Stripe equity compensation documents.',
      activities: [
        { matter_id: 'mt-mart-1', app: 'Westlaw', context: 'Search: community property RSU vesting marriage California', minutes: 48,
          narrative: 'Researched community property characterization of RSUs vesting during marriage; reviewed In re Marriage of Hug (154 Cal.App.4th 476) and Hug formula application to tech equity compensation',
          category: 'Legal Research', activity_code: 'L110' },
        { matter_id: 'mt-mart-1', app: 'Microsoft Word', context: 'Motion to Compel - Martinez v Martinez.docx', minutes: 42,
          narrative: 'Drafted motion to compel production of financial documents including Stripe equity compensation statements, RSU vesting schedules, and brokerage account records for the period of marriage',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 1.75,
      durationMinutes: 45,
      matter_id: 'mt-davi-1',
      summary: 'Phone consultation with Rachel Davis regarding safety planning and protective order timeline. Drafted initial declaration in support of restraining order documenting pattern of abuse.',
      activities: [
        { matter_id: 'mt-davi-1', app: 'Zoom', context: 'Call with Rachel Davis', minutes: 22,
          narrative: 'Phone consultation with client regarding safety plan implementation, reviewed timeline for DVRO hearing, discussed documentation of recent threatening text messages from respondent',
          category: 'Client Communication', activity_code: 'A102' },
        { matter_id: 'mt-davi-1', app: 'Microsoft Word', context: 'Declaration ISO DVRO - Davis.docx', minutes: 23,
          narrative: 'Drafted declaration in support of domestic violence restraining order documenting pattern of coercive control, two physical incidents, and threats; incorporated police report details from Officer Reyes',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 4,
      durationMinutes: 75,
      matter_id: 'mt-chen-1',
      summary: "Reviewed David Chen's asset disclosure spreadsheet and Sarah Williams' stock option summary. Emailed Rebecca Stein (Sarah's independent counsel) regarding disclosure timeline and initial negotiation framework.",
      activities: [
        { matter_id: 'mt-chen-1', app: 'Microsoft Excel', context: 'Chen-Williams Asset Schedule v2.xlsx', minutes: 40,
          narrative: "Reviewed and analyzed David Chen's pre-marital asset disclosure including Google RSU grants, 401(k) balances, and cryptocurrency holdings; cross-referenced with Sarah Williams' Figma equity summary",
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-chen-1', app: 'Microsoft Outlook', context: 'Email to Rebecca Stein re: disclosure timeline', minutes: 15,
          narrative: 'Emailed opposing independent counsel regarding agreed-upon disclosure timeline and proposed framework for prenuptial negotiation; attached initial asset summary for review',
          category: 'Client Communication', activity_code: 'A102' },
        { matter_id: 'mt-chen-1', app: 'Microsoft Word', context: 'Chen-Williams Prenup Draft v1.docx', minutes: 20,
          narrative: 'Began drafting prenuptial agreement framework addressing separate property characterization of pre-marital tech equity and proposed treatment of future appreciation during marriage',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 6.75,
      durationMinutes: 45,
      matter_id: 'mt-thom-1',
      summary: 'Researched relocation standards under LaMusga v. LaMusga and recent appellate decisions on move-away cases.',
      activities: [
        { matter_id: 'mt-thom-1', app: 'LexisNexis', context: 'Search: LaMusga move-away factors California 2025', minutes: 30,
          narrative: 'Researched current relocation standards under LaMusga v. LaMusga (2004) 32 Cal.4th 1094 and recent appellate decisions; identified strong precedent favoring stability when children are established in schools and community',
          category: 'Legal Research', activity_code: 'L110' },
        { matter_id: 'mt-thom-1', app: 'Adobe Acrobat', context: 'Thompson_Mark_Declaration_Relocation.pdf', minutes: 15,
          narrative: "Reviewed Mark Thompson's declaration regarding Nike employment offer in Portland; noted inconsistencies between stated start date and children's school calendar",
          category: 'Case Review', activity_code: 'A104' },
      ],
    },
  ],
  // Day -1 (yesterday)
  [
    {
      hourOffset: 0,
      durationMinutes: 75,
      matter_id: 'mt-mart-2',
      summary: "Prepared for upcoming mediation session in Martinez custody matter. Reviewed Dr. Park's preliminary custody evaluation notes and drafted proposed parenting time schedule.",
      activities: [
        { matter_id: 'mt-mart-2', app: 'Adobe Acrobat', context: 'Dr_Park_Custody_Eval_Preliminary.pdf', minutes: 40,
          narrative: "Reviewed Dr. Lisa Park's preliminary custody evaluation notes including parent interviews, home visits, and school reports; identified favorable findings regarding client's involvement in children's education and extracurricular activities",
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-mart-2', app: 'Microsoft Word', context: 'Martinez Proposed Parenting Plan v2.docx', minutes: 35,
          narrative: 'Drafted proposed parenting time schedule for mediation incorporating 2-2-3 rotation during school year and alternating weeks during summer; addressed holiday sharing and travel notification requirements',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 1.5,
      durationMinutes: 45,
      matter_id: 'mt-davi-2',
      summary: "Drafted ex parte application for emergency temporary custody order in Davis matter. Incorporated therapist's letter regarding children's behavioral changes.",
      activities: [
        { matter_id: 'mt-davi-2', app: 'Microsoft Word', context: 'Ex Parte Application - Davis Emergency Custody.docx', minutes: 35,
          narrative: "Drafted ex parte application for temporary sole legal and physical custody; incorporated Dr. Amanda Chen's letter documenting children's anxiety symptoms, sleep disturbances, and behavioral regression following exposure to domestic violence",
          category: 'Document Drafting', activity_code: 'A103' },
        { matter_id: 'mt-davi-2', app: 'Adobe Acrobat', context: 'Dr_Chen_Therapist_Letter.pdf', minutes: 10,
          narrative: "Reviewed children's therapist letter for incorporation into ex parte application; verified diagnostic impressions and treatment recommendations align with custody request",
          category: 'Case Review', activity_code: 'A104' },
      ],
    },
    {
      hourOffset: 3,
      durationMinutes: 45,
      matter_id: 'mt-okaf-1',
      summary: 'Reviewed USCIS Form I-600 requirements and supporting documentation checklist for Okafor international adoption. Coordinated with Nigerian counsel.',
      activities: [
        { matter_id: 'mt-okaf-1', app: 'Google Chrome', context: 'USCIS - Form I-600 Instructions', minutes: 25,
          narrative: 'Reviewed USCIS Form I-600 (Petition to Classify Orphan as an Immediate Relative) requirements and supporting documentation checklist; confirmed home study approval letter from Holt International is current',
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-okaf-1', app: 'Microsoft Outlook', context: 'Email to Patricia Ngozi - Lagos court docs', minutes: 20,
          narrative: 'Coordinated with Nigerian counsel Patricia Ngozi regarding obtaining certified copies of Lagos High Court custody order and death certificates; discussed apostille requirements for US immigration filing',
          category: 'Client Communication', activity_code: 'A102' },
      ],
    },
    {
      hourOffset: 5.5,
      durationMinutes: 75,
      matter_id: 'mt-mart-3',
      summary: "Reviewed forensic accountant's preliminary report on Stripe RSU valuation. Analyzed community property vs. separate property tracing for pre-marital stock grants.",
      activities: [
        { matter_id: 'mt-mart-3', app: 'Adobe Acrobat', context: 'Torres_RSU_Preliminary_Report.pdf', minutes: 42,
          narrative: "Reviewed Michael Torres' preliminary forensic report on Stripe RSU valuation methodology; analyzed time-rule application to grants spanning marriage date",
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-mart-3', app: 'Zoom', context: 'Call with Michael Torres re: methodology', minutes: 18,
          narrative: 'Conferred with forensic accountant regarding application of Hug formula to performance-based RSU grants; discussed alternative valuation approaches for unvested equity',
          category: 'Client Communication', activity_code: 'A102' },
        { matter_id: 'mt-mart-3', app: 'Westlaw', context: 'Search: Hug formula performance vesting California', minutes: 15,
          narrative: 'Researched authority for application of Hug time-rule to performance-vested equity awards versus standard time-vested grants',
          category: 'Legal Research', activity_code: 'L110' },
      ],
    },
  ],
  // Day -2
  [
    {
      hourOffset: 0,
      durationMinutes: 60,
      matter_id: 'mt-pate-1',
      summary: "Prepared income and expense declaration for Patel child support modification hearing. Analyzed guideline calculation under reduced consulting income.",
      activities: [
        { matter_id: 'mt-pate-1', app: 'DissoMaster', context: 'Patel Guideline Support Calculation', minutes: 35,
          narrative: 'Ran DissoMaster guideline support calculations using current consulting income of $120K; modeled scenarios with and without imputed income at prior W-2 level',
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-pate-1', app: 'Microsoft Word', context: 'Patel I&E Declaration FL-150.docx', minutes: 25,
          narrative: "Prepared income and expense declaration (FL-150) reflecting Amit Patel's reduced consulting income, documented good-faith job search efforts and current market conditions for senior engineering roles",
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 2,
      durationMinutes: 45,
      matter_id: 'mt-thom-2',
      summary: "Drafted opposition to Thompson relocation request applying LaMusga factors. Emphasized children's established schools and extracurricular activities in Berkeley.",
      activities: [
        { matter_id: 'mt-thom-2', app: 'Microsoft Word', context: 'Opposition to Relocation - Thompson.docx', minutes: 45,
          narrative: 'Drafted opposition to relocation request applying LaMusga factors; emphasized stability of current arrangement, children\'s established Berkeley schools, and absence of compelling reason for move',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 3.5,
      durationMinutes: 30,
      matter_id: 'nb-admin',
      summary: 'Updated calendar for upcoming court dates and filing deadlines. Reviewed and finalized billing entries for prior week.',
      activities: [
        { matter_id: 'nb-admin', app: 'Google Chrome', context: 'Google Calendar - Court dates', minutes: 15,
          narrative: 'Updated master calendar with upcoming court dates, filing deadlines, and discovery cutoff dates for all active family law matters',
          category: 'Administrative', activity_code: 'A106' },
        { matter_id: 'nb-admin', app: 'Google Chrome', context: 'Clio - Time entries review', minutes: 15,
          narrative: 'Reviewed and finalized billing entries for prior week; prepared conflict check memorandum for prospective new client intake',
          category: 'Administrative', activity_code: 'A106' },
      ],
    },
    {
      hourOffset: 4.5,
      durationMinutes: 60,
      matter_id: 'mt-chen-1',
      summary: "Drafted spousal support waiver provisions for Chen-Williams prenuptial agreement. Researched enforceability standards under California Family Code section 1612.",
      activities: [
        { matter_id: 'mt-chen-1', app: 'Westlaw', context: 'Search: prenuptial spousal support waiver enforceability California', minutes: 25,
          narrative: 'Researched enforceability of spousal support waivers in prenuptial agreements under Family Code §1612(c) and In re Marriage of Pendleton & Fireman; identified independent counsel and disclosure requirements',
          category: 'Legal Research', activity_code: 'L110' },
        { matter_id: 'mt-chen-1', app: 'Microsoft Word', context: 'Chen-Williams Prenup Draft v2.docx', minutes: 35,
          narrative: 'Drafted Article VII spousal support provisions including mutual waiver subject to enforceability requirements; incorporated independent counsel acknowledgment and full disclosure schedules',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
  ],
  // Day -3
  [
    {
      hourOffset: 0,
      durationMinutes: 90,
      matter_id: 'mt-davi-1',
      summary: 'Prepared for DVRO hearing scheduled April 2. Organized exhibits including police reports, threatening text messages, and medical records.',
      activities: [
        { matter_id: 'mt-davi-1', app: 'Adobe Acrobat', context: 'Davis_DVRO_Exhibit_Bundle.pdf', minutes: 50,
          narrative: 'Organized DVRO hearing exhibits including SJPD police report, photographs of injuries, threatening text message screenshots (15 messages over 30 days), and emergency room records from March 1 incident',
          category: 'Document Drafting', activity_code: 'A103' },
        { matter_id: 'mt-davi-1', app: 'Microsoft Word', context: 'Witness Outline - Officer Reyes.docx', minutes: 25,
          narrative: 'Prepared direct examination outline for Officer Reyes covering responding officer observations, statements made by respondent at scene, and post-incident threats reported to police',
          category: 'Document Drafting', activity_code: 'A103' },
        { matter_id: 'mt-davi-1', app: 'Zoom', context: 'Call with Maria Santos - DV Advocate', minutes: 15,
          narrative: 'Coordinated with DV advocate Maria Santos regarding client safety planning during hearing day, courthouse escort arrangements, and post-hearing transportation to confidential shelter',
          category: 'Client Communication', activity_code: 'A102' },
      ],
    },
    {
      hourOffset: 2.25,
      durationMinutes: 30,
      matter_id: 'nb-cle',
      summary: 'Attended CLE webinar on updated California custody evaluation standards and recent amendments to Family Code section 3044.',
      activities: [
        { matter_id: 'nb-cle', app: 'Zoom', context: 'CLE: FC §3044 DV Presumptions', minutes: 30,
          narrative: 'Completed 0.5 MCLE credit on Family Code §3044 domestic violence presumptions and recent appellate developments in custody determinations',
          category: 'Administrative', activity_code: 'A106' },
      ],
    },
    {
      hourOffset: 3,
      durationMinutes: 75,
      matter_id: 'mt-okaf-1',
      summary: 'Compiled final I-600 petition packet for Okafor international adoption. Reviewed Hague Convention compliance documentation.',
      activities: [
        { matter_id: 'mt-okaf-1', app: 'Adobe Acrobat', context: 'Okafor_I-600_Final_Packet.pdf', minutes: 50,
          narrative: 'Compiled and finalized I-600 petition packet including home study, Lagos court order with apostille, death certificates, financial affidavits, and FBI background checks for both petitioners',
          category: 'Document Drafting', activity_code: 'A103' },
        { matter_id: 'mt-okaf-1', app: 'Google Chrome', context: 'USCIS Hague Convention compliance', minutes: 25,
          narrative: 'Verified Hague Convention compliance status — Nigeria not a Hague country, confirmed orphan petition pathway under INA §101(b)(1)(F) is applicable',
          category: 'Case Review', activity_code: 'A104' },
      ],
    },
    {
      hourOffset: 5,
      durationMinutes: 60,
      matter_id: 'mt-mart-2',
      summary: 'Mediation session with Roberto and Elena Martinez regarding parenting plan. Reached preliminary agreement on summer schedule.',
      activities: [
        { matter_id: 'mt-mart-2', app: 'Zoom', context: 'Mediation - Martinez Parenting Plan', minutes: 60,
          narrative: 'Attended mediation session with both parents; reached preliminary agreement on summer schedule (alternating weeks) and holiday rotation; outstanding issues remain regarding school year primary residence',
          category: 'Client Communication', activity_code: 'A102' },
      ],
    },
  ],
  // Day -4
  [
    {
      hourOffset: 0,
      durationMinutes: 60,
      matter_id: 'mt-mart-1',
      summary: 'Reviewed opposing counsel\'s discovery responses in Martinez dissolution. Identified deficiencies and drafted meet-and-confer letter.',
      activities: [
        { matter_id: 'mt-mart-1', app: 'Adobe Acrobat', context: 'Whitfield_Discovery_Responses.pdf', minutes: 35,
          narrative: 'Reviewed opposing counsel James Whitfield\'s responses to first set of requests for production; identified six categories of deficient responses including incomplete RSU vesting documentation and missing brokerage statements',
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-mart-1', app: 'Microsoft Word', context: 'Meet and Confer Letter - Whitfield.docx', minutes: 25,
          narrative: 'Drafted meet-and-confer letter to opposing counsel detailing six categories of deficient discovery responses with specific code-compliant language; established deadline for supplemental responses prior to motion to compel',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
    {
      hourOffset: 1.5,
      durationMinutes: 45,
      matter_id: 'mt-pate-1',
      summary: 'Reviewed updated guideline support calculations and prepared settlement counter-proposal for Patel child support modification.',
      activities: [
        { matter_id: 'mt-pate-1', app: 'DissoMaster', context: 'Patel - Updated Guidelines', minutes: 20,
          narrative: 'Updated DissoMaster calculations incorporating most recent quarterly consulting income; modeled three scenarios for negotiation including 25%, 50%, and 75% imputation of prior W-2 income',
          category: 'Case Review', activity_code: 'A104' },
        { matter_id: 'mt-pate-1', app: 'Microsoft Outlook', context: 'Email to Karen West - settlement proposal', minutes: 25,
          narrative: 'Drafted settlement counter-proposal to opposing counsel Karen West proposing temporary 18-month modification with annual review based on actual consulting earnings; included supporting DissoMaster output',
          category: 'Client Communication', activity_code: 'A102' },
      ],
    },
    {
      hourOffset: 3,
      durationMinutes: 30,
      matter_id: 'nb-bizdev',
      summary: 'Updated firm website family law practice page and authored LinkedIn article on RSU treatment in California divorce.',
      activities: [
        { matter_id: 'nb-bizdev', app: 'LinkedIn', context: 'Article: RSU Treatment in California Divorce', minutes: 30,
          narrative: 'Authored and published LinkedIn article on community property treatment of restricted stock units in California divorce; included Hug formula analysis and tech industry case studies',
          category: 'Administrative', activity_code: 'A106' },
      ],
    },
    {
      hourOffset: 4,
      durationMinutes: 75,
      matter_id: 'mt-thom-1',
      summary: 'Met with Jessica Thompson to review opposition strategy and prepare client testimony for relocation hearing.',
      activities: [
        { matter_id: 'mt-thom-1', app: 'Zoom', context: 'Client meeting - Jessica Thompson', minutes: 60,
          narrative: 'Conferred with client to review opposition strategy under LaMusga factors; prepared testimony outline emphasizing children\'s academic performance, established friendships, and involvement in Berkeley community programs',
          category: 'Client Communication', activity_code: 'A102' },
        { matter_id: 'mt-thom-1', app: 'Microsoft Word', context: 'Thompson_Direct_Examination_Outline.docx', minutes: 15,
          narrative: 'Drafted direct examination outline for client testimony at relocation hearing covering parenting history, children\'s established routines, and impact of proposed move',
          category: 'Document Drafting', activity_code: 'A103' },
      ],
    },
  ],
]

// ─── Generate sessions/activities relative to today ───────────────────────

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function dateAtLocal(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d
}

function buildCategoriesFromActivities(acts: ActivityTemplate[]) {
  const totals = new Map<string, number>()
  for (const a of acts) {
    totals.set(a.category, (totals.get(a.category) || 0) + a.minutes)
  }
  const totalMin = Array.from(totals.values()).reduce((s, v) => s + v, 0)
  return Array.from(totals.entries()).map(([name, minutes]) => ({
    name,
    minutes,
    percentage: totalMin > 0 ? Math.round((minutes / totalMin) * 100) : 0,
  }))
}

function generateSessionsAndActivities(): { sessions: any[]; activities: Activity[] } {
  const sessions: any[] = []
  const activities: Activity[] = []

  SESSION_TEMPLATES_BY_DAY.forEach((daysSessions, dayIdx) => {
    daysSessions.forEach((tpl, sessIdx) => {
      const startHour = 9 + Math.floor(tpl.hourOffset)
      const startMin = Math.round((tpl.hourOffset - Math.floor(tpl.hourOffset)) * 60)
      const start = dateAtLocal(dayIdx, startHour, startMin)
      const end = new Date(start.getTime() + tpl.durationMinutes * 60_000)

      const sessionId = `s-d${dayIdx}-${sessIdx}`
      const matter = DEMO_MATTERS.find(m => m.id === tpl.matter_id)
      const sessionRow: any = {
        id: sessionId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'completed',
        summary: tpl.summary,
        categories: buildCategoriesFromActivities(tpl.activities),
        activities: [],
        matter_id: tpl.matter_id,
      }
      sessions.push(sessionRow)

      // Build activities with start/end times sequentially within the session
      let cursor = start.getTime()
      tpl.activities.forEach((a, actIdx) => {
        const actStart = new Date(cursor)
        const actEnd = new Date(cursor + a.minutes * 60_000)
        cursor = actEnd.getTime()

        const actMatter = DEMO_MATTERS.find(m => m.id === a.matter_id)
        const isNonBillable = actMatter?.billing_type === 'non-billable'
        activities.push({
          id: `a-d${dayIdx}-${sessIdx}-${actIdx}`,
          session_id: sessionId,
          matter_id: a.matter_id,
          app: a.app,
          context: a.context,
          minutes: a.minutes,
          narrative: a.narrative,
          category: a.category,
          billable: !isNonBillable,
          effective_rate: isNonBillable ? null : (actMatter?.hourly_rate ?? null),
          activity_code: a.activity_code,
          sort_order: actIdx,
          start_time: actStart.toISOString(),
          end_time: actEnd.toISOString(),
        })
      })
    })
  })

  return { sessions, activities }
}

// ─── Mutable in-memory state ──────────────────────────────────────────────
// Recreated on page load (not persisted across reloads). Mutations during
// a demo session work but reset when the user reloads.

const generated = generateSessionsAndActivities()

export const demoState = {
  clients: [...DEMO_CLIENTS],
  matters: [...DEMO_MATTERS],
  sessions: generated.sessions,
  activities: generated.activities,
}
