-- ============================================================
-- Demo seed: realistic family law practice data
-- Run in Supabase SQL Editor (production)
-- ============================================================

DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'shivam@donnaanswers.com';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User shivam@donnaanswers.com not found';
  END IF;

  -- ─── Clean existing data (keep internal client + non-billable matters) ───
  DELETE FROM public.activities WHERE user_id = uid;
  DELETE FROM public.sessions WHERE user_id = uid;
  DELETE FROM public.matters WHERE user_id = uid AND billing_type != 'non-billable';
  DELETE FROM public.clients WHERE user_id = uid AND is_internal IS NOT TRUE;

  -- ═══════════════════════════════════════════════════════════
  -- CLIENTS
  -- ═══════════════════════════════════════════════════════════

  INSERT INTO public.clients (id, user_id, name, contact_info, billing_address, default_rate, notes, is_internal) VALUES
  ('cl-mart', uid, 'Martinez, Roberto & Elena',
   'roberto.martinez@gmail.com | (415) 555-2847',
   '1842 Pacific Heights Blvd, San Francisco, CA 94115',
   450, 'High-asset divorce — contested property division, two minor children (ages 8, 12). Roberto is a tech executive at Stripe, Elena is a physician at UCSF. Complex stock option and RSU valuation issues. Referred by David Chen at Morrison Foerster.', FALSE),

  ('cl-thom', uid, 'Thompson, Jessica',
   'jthompson@outlook.com | (510) 555-9134',
   '2205 Hillegass Ave, Berkeley, CA 94704',
   375, 'Seeking custody modification after ex-husband announced relocation to Portland. Two children (ages 5, 9). Amicable co-parenting relationship until relocation issue. Works as a high school teacher.', FALSE),

  ('cl-chen', uid, 'Chen, David & Williams, Sarah',
   'david.chen@gmail.com | (415) 555-6203',
   '580 Bush St, Apt 1204, San Francisco, CA 94108',
   400, 'Pre-marital couple — David is a software engineer at Google, Sarah is a product manager at Figma. Both have significant pre-marital assets and stock options. Wedding planned for September 2026.', FALSE),

  ('cl-okaf', uid, 'Okafor, Nkem & Adaeze',
   'nokafor@yahoo.com | (925) 555-4718',
   '3847 Blackhawk Dr, Danville, CA 94506',
   350, 'International adoption from Nigeria — adopting Nkem''s 6-year-old niece after her parents passed away. Nkem is a US citizen, originally from Lagos. Complex immigration and Hague Convention considerations.', FALSE),

  ('cl-davi', uid, 'Davis, Rachel',
   'rachel.d.secure@protonmail.com | (408) 555-3291',
   'Address withheld — safety concerns',
   375, 'Domestic violence survivor seeking DVRO and emergency custody. Fled marital home with two children (ages 3, 7). Currently in a confidential shelter. Husband is a corporate attorney. HIGH PRIORITY — safety risk.', FALSE),

  ('cl-pate', uid, 'Patel, Amit',
   'amit.patel.esq@gmail.com | (650) 555-8456',
   '1120 Hamilton Ave, Palo Alto, CA 94301',
   350, 'Seeking child support modification — lost senior engineering position at Meta during layoffs, now consulting at reduced income. Two children (ages 10, 14) from prior marriage. Ex-wife is an anesthesiologist.', FALSE);

  -- ═══════════════════════════════════════════════════════════
  -- MATTERS (10 billable)
  -- ═══════════════════════════════════════════════════════════

  INSERT INTO public.matters (id, user_id, client_id, name, matter_number, status, practice_area, billing_type, hourly_rate, keywords, key_people, team_members, notes) VALUES
  ('mt-mart-1', uid, 'cl-mart', 'Dissolution of Marriage', '2026-FL-001', 'active',
   'Family Law — Divorce', 'hourly', 450,
   '["martinez", "dissolution", "divorce", "community property", "asset division", "RSU", "stock options"]'::jsonb,
   '[{"name": "Roberto Martinez", "role": "Petitioner"}, {"name": "Elena Martinez", "role": "Respondent"}, {"name": "James Whitfield", "role": "Opposing Counsel — Whitfield & Associates"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}, {"name": "Michael Torres", "role": "Forensic Accountant — BDO"}]'::jsonb,
   'Filed Jan 2026. Contested — major disputes over Stripe RSU vesting schedule and UCSF pension. Discovery phase.'),

  ('mt-mart-2', uid, 'cl-mart', 'Child Custody & Parenting Plan', '2026-FL-002', 'active',
   'Family Law — Custody', 'hourly', 450,
   '["martinez", "custody", "parenting plan", "visitation", "best interest", "child"]'::jsonb,
   '[{"name": "Roberto Martinez", "role": "Father"}, {"name": "Elena Martinez", "role": "Mother"}, {"name": "Dr. Lisa Park", "role": "Custody Evaluator"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Both parents want primary custody. Custody evaluation ordered by court — Dr. Park conducting 730 evaluation.'),

  ('mt-mart-3', uid, 'cl-mart', 'Property Division — Business Valuation', '2026-FL-009', 'active',
   'Family Law — Divorce', 'hourly', 450,
   '["martinez", "property division", "business valuation", "RSU", "stock options", "pension", "QDRO"]'::jsonb,
   '[{"name": "Michael Torres", "role": "Forensic Accountant — BDO"}, {"name": "James Whitfield", "role": "Opposing Counsel"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Tracing Stripe RSUs — need to determine community vs. separate property characterization. UCSF pension requires QDRO.'),

  ('mt-thom-1', uid, 'cl-thom', 'Custody Modification', '2026-FL-003', 'active',
   'Family Law — Custody', 'hourly', 375,
   '["thompson", "custody modification", "relocation", "move-away", "best interest"]'::jsonb,
   '[{"name": "Jessica Thompson", "role": "Petitioner (Mother)"}, {"name": "Mark Thompson", "role": "Respondent (Father)"}, {"name": "Linda Chow", "role": "Opposing Counsel"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Father wants to relocate to Portland for a new job at Nike. Mother opposes — children are established in Berkeley schools.'),

  ('mt-thom-2', uid, 'cl-thom', 'Relocation Request Response', '2026-FL-010', 'active',
   'Family Law — Custody', 'hourly', 375,
   '["thompson", "relocation", "move-away", "LaMusga factors", "opposition"]'::jsonb,
   '[{"name": "Mark Thompson", "role": "Moving Party"}, {"name": "Linda Chow", "role": "Opposing Counsel"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Responding to Mark''s formal relocation request. Analyzing LaMusga factors — stability of current arrangement is strong.'),

  ('mt-chen-1', uid, 'cl-chen', 'Prenuptial Agreement', '2026-FL-004', 'active',
   'Family Law — Prenup', 'hourly', 400,
   '["chen", "williams", "prenuptial", "prenup", "premarital agreement", "separate property"]'::jsonb,
   '[{"name": "David Chen", "role": "Client — Fiancé"}, {"name": "Sarah Williams", "role": "Client — Fiancée"}, {"name": "Rebecca Stein", "role": "Independent Counsel for Sarah"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Both parties have significant pre-marital tech stock. Need to address unvested RSUs, future appreciation, and potential spousal support waiver. Collaborative approach — both want fairness.'),

  ('mt-okaf-1', uid, 'cl-okaf', 'International Adoption', '2026-FL-005', 'active',
   'Family Law — Adoption', 'hourly', 350,
   '["okafor", "adoption", "international", "Nigeria", "Hague Convention", "USCIS", "I-600", "immigration"]'::jsonb,
   '[{"name": "Nkem Okafor", "role": "Petitioner (Uncle)"}, {"name": "Adaeze Okafor", "role": "Petitioner (Aunt)"}, {"name": "Chioma Okafor", "role": "Child (age 6)"}, {"name": "Agent Pham", "role": "USCIS Officer"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}, {"name": "Patricia Ngozi", "role": "Nigerian Counsel — Lagos"}]'::jsonb,
   'Orphan petition — I-600 filing. Home study approved. Awaiting USCIS I-171H approval. Nigerian court order for custody obtained.'),

  ('mt-davi-1', uid, 'cl-davi', 'Protective Order (DVRO)', '2026-FL-006', 'active',
   'Family Law — Domestic Violence', 'hourly', 375,
   '["davis", "DVRO", "protective order", "restraining order", "domestic violence", "TRO"]'::jsonb,
   '[{"name": "Rachel Davis", "role": "Petitioner"}, {"name": "Gregory Davis", "role": "Respondent"}, {"name": "Officer Reyes", "role": "Reporting Officer — SJPD"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}, {"name": "Maria Santos", "role": "DV Advocate — Next Door Solutions"}]'::jsonb,
   'TRO granted March 5. DVRO hearing scheduled for April 2. Pattern of coercive control and two documented physical incidents. Police report on file.'),

  ('mt-davi-2', uid, 'cl-davi', 'Emergency Custody', '2026-FL-007', 'active',
   'Family Law — Custody', 'hourly', 375,
   '["davis", "emergency custody", "ex parte", "temporary custody", "child safety"]'::jsonb,
   '[{"name": "Rachel Davis", "role": "Petitioner"}, {"name": "Gregory Davis", "role": "Respondent"}, {"name": "Dr. Amanda Chen", "role": "Children''s Therapist"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Ex parte motion for temporary sole custody granted March 10. Children (3, 7) in therapy. Supervised visitation only per court order.'),

  ('mt-pate-1', uid, 'cl-pate', 'Child Support Modification', '2026-FL-008', 'active',
   'Family Law — Support', 'hourly', 350,
   '["patel", "child support", "modification", "income change", "guideline support", "imputed income"]'::jsonb,
   '[{"name": "Amit Patel", "role": "Petitioner (Father)"}, {"name": "Dr. Priya Sharma", "role": "Respondent (Mother)"}, {"name": "Karen West", "role": "Opposing Counsel — West Family Law"}]'::jsonb,
   '[{"name": "Sarah Kim", "role": "Paralegal"}]'::jsonb,
   'Amit''s W-2 income dropped from $285K to $120K consulting. Opposing counsel arguing income should be imputed at prior level. Need to demonstrate good-faith job search and market conditions.');

  -- ═══════════════════════════════════════════════════════════
  -- SESSIONS + ACTIVITIES (10 business days: March 16–27, 2026)
  -- All times in UTC (PDT is UTC−7 in March 2026)
  -- 9:00 AM PDT = 16:00 UTC, etc.
  -- ═══════════════════════════════════════════════════════════

  -- ────────────────────────────────────────────────────────────
  -- MARCH 16 (Monday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0316-1', uid, '2026-03-16T16:00:00Z', '2026-03-16T17:30:00Z', 'completed',
   'Conducted research on community property characterization of RSUs vesting during marriage. Reviewed In re Marriage of Hug and related precedent. Began drafting motion to compel production of Stripe equity compensation documents.',
   '[{"name": "Legal Research", "minutes": 48, "percentage": 53}, {"name": "Document Drafting", "minutes": 42, "percentage": 47}]'::jsonb,
   '[]'::jsonb, 'mt-mart-1'),

  ('s-0316-2', uid, '2026-03-16T17:45:00Z', '2026-03-16T18:30:00Z', 'completed',
   'Phone consultation with Rachel Davis regarding safety planning and protective order timeline. Drafted initial declaration in support of restraining order documenting pattern of abuse.',
   '[{"name": "Client Communication", "minutes": 22, "percentage": 49}, {"name": "Document Drafting", "minutes": 23, "percentage": 51}]'::jsonb,
   '[]'::jsonb, 'mt-davi-1'),

  ('s-0316-3', uid, '2026-03-16T20:00:00Z', '2026-03-16T21:15:00Z', 'completed',
   'Reviewed David Chen''s asset disclosure spreadsheet and Sarah Williams'' stock option summary. Emailed Rebecca Stein (Sarah''s independent counsel) regarding disclosure timeline and initial negotiation framework.',
   '[{"name": "Case Review", "minutes": 40, "percentage": 53}, {"name": "Client Communication", "minutes": 15, "percentage": 20}, {"name": "Document Drafting", "minutes": 20, "percentage": 27}]'::jsonb,
   '[]'::jsonb, 'mt-chen-1'),

  ('s-0316-4', uid, '2026-03-16T21:30:00Z', '2026-03-16T22:30:00Z', 'completed',
   'Updated calendar for upcoming court dates and filing deadlines. Reviewed and finalized billing entries for prior week. Prepared conflict check memo for new intake.',
   '[{"name": "Administrative", "minutes": 60, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-admin'),

  ('s-0316-5', uid, '2026-03-16T22:45:00Z', '2026-03-16T23:30:00Z', 'completed',
   'Researched relocation standards under LaMusga v. LaMusga and recent appellate decisions on move-away cases. Reviewed Mark Thompson''s declaration regarding Portland job offer.',
   '[{"name": "Legal Research", "minutes": 30, "percentage": 67}, {"name": "Case Review", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-thom-1');

  -- March 16 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0316-1a', uid, 's-0316-1', 'mt-mart-1', 'Westlaw', 'Search: community property RSU vesting marriage California', 48,
   'Researched community property characterization of RSUs vesting during marriage; reviewed In re Marriage of Hug (154 Cal.App.4th 476) and Hug formula application to tech equity compensation; identified key precedent on time-based vs. performance-based vesting distinctions',
   'Legal Research', TRUE, 450, 'L110', 0, '2026-03-16T16:00:00Z', '2026-03-16T16:48:00Z', 'pending'),
  ('a-0316-1b', uid, 's-0316-1', 'mt-mart-1', 'Microsoft Word', 'Motion to Compel - Martinez v Martinez.docx', 42,
   'Drafted motion to compel production of financial documents including Stripe equity compensation statements, RSU vesting schedules, and brokerage account records for the period of marriage',
   'Document Drafting', TRUE, 450, 'A103', 1, '2026-03-16T16:48:00Z', '2026-03-16T17:30:00Z', 'pending'),

  ('a-0316-2a', uid, 's-0316-2', 'mt-davi-1', 'Zoom', 'Call with Rachel Davis', 22,
   'Phone consultation with client regarding safety plan implementation, reviewed timeline for DVRO hearing, discussed documentation of recent threatening text messages from respondent',
   'Client Communication', TRUE, 375, 'A102', 0, '2026-03-16T17:45:00Z', '2026-03-16T18:07:00Z', 'pending'),
  ('a-0316-2b', uid, 's-0316-2', 'mt-davi-1', 'Microsoft Word', 'Declaration ISO DVRO - Davis.docx', 23,
   'Drafted declaration in support of domestic violence restraining order documenting pattern of coercive control, two physical incidents, and threats; incorporated police report details from Officer Reyes',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-16T18:07:00Z', '2026-03-16T18:30:00Z', 'pending'),

  ('a-0316-3a', uid, 's-0316-3', 'mt-chen-1', 'Microsoft Excel', 'Chen-Williams Asset Schedule v2.xlsx', 40,
   'Reviewed and analyzed David Chen''s pre-marital asset disclosure including Google RSU grants, 401(k) balances, and cryptocurrency holdings; cross-referenced with Sarah Williams'' Figma equity summary',
   'Case Review', TRUE, 400, 'A104', 0, '2026-03-16T20:00:00Z', '2026-03-16T20:40:00Z', 'pending'),
  ('a-0316-3b', uid, 's-0316-3', 'mt-chen-1', 'Microsoft Outlook', 'Email to Rebecca Stein re: disclosure timeline', 15,
   'Emailed opposing independent counsel regarding agreed-upon disclosure timeline and proposed framework for prenuptial negotiation; attached initial asset summary for review',
   'Client Communication', TRUE, 400, 'A102', 1, '2026-03-16T20:40:00Z', '2026-03-16T20:55:00Z', 'pending'),
  ('a-0316-3c', uid, 's-0316-3', 'mt-chen-1', 'Microsoft Word', 'Chen-Williams Prenup Draft v1.docx', 20,
   'Began drafting prenuptial agreement framework addressing separate property characterization of pre-marital tech equity and proposed treatment of future appreciation during marriage',
   'Document Drafting', TRUE, 400, 'A103', 2, '2026-03-16T20:55:00Z', '2026-03-16T21:15:00Z', 'pending'),

  ('a-0316-4a', uid, 's-0316-4', 'nb-admin', 'Google Chrome', 'Google Calendar - Court dates', 30,
   'Updated master calendar with upcoming court dates, filing deadlines, and discovery cutoff dates for all active family law matters',
   'Administrative', FALSE, NULL, 'A106', 0, '2026-03-16T21:30:00Z', '2026-03-16T22:00:00Z', 'pending'),
  ('a-0316-4b', uid, 's-0316-4', 'nb-admin', 'Google Chrome', 'Clio - Time entries review', 30,
   'Reviewed and finalized billing entries for prior week; prepared conflict check memorandum for prospective new client intake (guardianship matter)',
   'Administrative', FALSE, NULL, 'A106', 1, '2026-03-16T22:00:00Z', '2026-03-16T22:30:00Z', 'pending'),

  ('a-0316-5a', uid, 's-0316-5', 'mt-thom-1', 'LexisNexis', 'Search: LaMusga move-away factors California 2025', 30,
   'Researched current relocation standards under LaMusga v. LaMusga (2004) 32 Cal.4th 1094 and recent appellate decisions; identified strong precedent favoring stability when children are established in schools and community',
   'Legal Research', TRUE, 375, 'L110', 0, '2026-03-16T22:45:00Z', '2026-03-16T23:15:00Z', 'pending'),
  ('a-0316-5b', uid, 's-0316-5', 'mt-thom-1', 'Adobe Acrobat', 'Thompson_Mark_Declaration_Relocation.pdf', 15,
   'Reviewed Mark Thompson''s declaration regarding Nike employment offer in Portland; noted inconsistencies between stated start date and children''s school calendar',
   'Case Review', TRUE, 375, 'A104', 1, '2026-03-16T23:15:00Z', '2026-03-16T23:30:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 17 (Tuesday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0317-1', uid, '2026-03-17T15:45:00Z', '2026-03-17T17:00:00Z', 'completed',
   'Prepared for upcoming mediation session in Martinez custody matter. Reviewed Dr. Park''s preliminary custody evaluation notes and drafted proposed parenting time schedule.',
   '[{"name": "Case Review", "minutes": 40, "percentage": 53}, {"name": "Document Drafting", "minutes": 35, "percentage": 47}]'::jsonb,
   '[]'::jsonb, 'mt-mart-2'),

  ('s-0317-2', uid, '2026-03-17T17:15:00Z', '2026-03-17T18:00:00Z', 'completed',
   'Drafted ex parte application for emergency temporary custody order in Davis matter. Incorporated therapist''s letter regarding children''s behavioral changes.',
   '[{"name": "Document Drafting", "minutes": 35, "percentage": 78}, {"name": "Case Review", "minutes": 10, "percentage": 22}]'::jsonb,
   '[]'::jsonb, 'mt-davi-2'),

  ('s-0317-3', uid, '2026-03-17T18:15:00Z', '2026-03-17T19:00:00Z', 'completed',
   'Reviewed USCIS Form I-600 requirements and supporting documentation checklist for Okafor international adoption. Coordinated with Nigerian counsel on obtaining required court documents.',
   '[{"name": "Case Review", "minutes": 25, "percentage": 56}, {"name": "Client Communication", "minutes": 20, "percentage": 44}]'::jsonb,
   '[]'::jsonb, 'mt-okaf-1'),

  ('s-0317-4', uid, '2026-03-17T20:30:00Z', '2026-03-17T21:45:00Z', 'completed',
   'Reviewed forensic accountant''s preliminary report on Stripe RSU valuation. Analyzed community property vs. separate property tracing for pre-marital stock grants. Called Michael Torres to discuss methodology questions.',
   '[{"name": "Case Review", "minutes": 42, "percentage": 56}, {"name": "Client Communication", "minutes": 18, "percentage": 24}, {"name": "Legal Research", "minutes": 15, "percentage": 20}]'::jsonb,
   '[]'::jsonb, 'mt-mart-3'),

  ('s-0317-5', uid, '2026-03-17T22:00:00Z', '2026-03-17T22:30:00Z', 'completed',
   'Attended CLE webinar on updated California custody evaluation standards and recent amendments to Family Code section 3044 regarding domestic violence presumptions.',
   '[{"name": "Administrative", "minutes": 30, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-cle');

  -- March 17 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0317-1a', uid, 's-0317-1', 'mt-mart-2', 'Adobe Acrobat', 'Dr_Park_Custody_Eval_Preliminary.pdf', 40,
   'Reviewed Dr. Lisa Park''s preliminary custody evaluation notes including parent interviews, home visits, and school reports; identified favorable findings regarding client''s involvement in children''s education and extracurricular activities',
   'Case Review', TRUE, 450, 'A104', 0, '2026-03-17T15:45:00Z', '2026-03-17T16:25:00Z', 'pending'),
  ('a-0317-1b', uid, 's-0317-1', 'mt-mart-2', 'Microsoft Word', 'Martinez Proposed Parenting Plan v2.docx', 35,
   'Drafted proposed parenting time schedule for mediation incorporating 2-2-3 rotation during school year and alternating weeks during summer; addressed holiday sharing and travel notification requirements',
   'Document Drafting', TRUE, 450, 'A103', 1, '2026-03-17T16:25:00Z', '2026-03-17T17:00:00Z', 'pending'),

  ('a-0317-2a', uid, 's-0317-2', 'mt-davi-2', 'Microsoft Word', 'Ex Parte Application - Davis Emergency Custody.docx', 35,
   'Drafted ex parte application for temporary sole legal and physical custody; incorporated Dr. Amanda Chen''s letter documenting children''s anxiety symptoms, sleep disturbances, and behavioral regression following exposure to domestic violence',
   'Document Drafting', TRUE, 375, 'A103', 0, '2026-03-17T17:15:00Z', '2026-03-17T17:50:00Z', 'pending'),
  ('a-0317-2b', uid, 's-0317-2', 'mt-davi-2', 'Adobe Acrobat', 'Dr_Chen_Therapist_Letter.pdf', 10,
   'Reviewed children''s therapist letter for incorporation into ex parte application; verified diagnostic impressions and treatment recommendations align with custody request',
   'Case Review', TRUE, 375, 'A104', 1, '2026-03-17T17:50:00Z', '2026-03-17T18:00:00Z', 'pending'),

  ('a-0317-3a', uid, 's-0317-3', 'mt-okaf-1', 'Google Chrome', 'USCIS - Form I-600 Instructions', 25,
   'Reviewed USCIS Form I-600 (Petition to Classify Orphan as an Immediate Relative) requirements and supporting documentation checklist; confirmed home study approval letter from Holt International is current',
   'Case Review', TRUE, 350, 'A104', 0, '2026-03-17T18:15:00Z', '2026-03-17T18:40:00Z', 'pending'),
  ('a-0317-3b', uid, 's-0317-3', 'mt-okaf-1', 'Microsoft Outlook', 'Email to Patricia Ngozi - Lagos court docs', 20,
   'Coordinated with Nigerian counsel Patricia Ngozi regarding obtaining certified copies of Lagos High Court custody order and death certificates; discussed apostille requirements for US immigration filing',
   'Client Communication', TRUE, 350, 'A102', 1, '2026-03-17T18:40:00Z', '2026-03-17T19:00:00Z', 'pending'),

  ('a-0317-4a', uid, 's-0317-4', 'mt-mart-3', 'Adobe Acrobat', 'BDO_Martinez_RSU_Valuation_Prelim.pdf', 42,
   'Reviewed Michael Torres'' preliminary forensic accounting report on Stripe RSU valuation; analyzed community property tracing methodology for pre-marital grants with post-marital vesting; identified $2.3M in disputed characterization',
   'Case Review', TRUE, 450, 'A104', 0, '2026-03-17T20:30:00Z', '2026-03-17T21:12:00Z', 'pending'),
  ('a-0317-4b', uid, 's-0317-4', 'mt-mart-3', 'Zoom', 'Call with Michael Torres - BDO', 18,
   'Discussed valuation methodology questions with forensic accountant including treatment of unvested RSUs and appropriate discount rate; requested supplemental analysis on UCSF pension present value',
   'Client Communication', TRUE, 450, 'A102', 1, '2026-03-17T21:12:00Z', '2026-03-17T21:30:00Z', 'pending'),
  ('a-0317-4c', uid, 's-0317-4', 'mt-mart-3', 'Westlaw', 'Search: Hug formula RSU valuation California', 15,
   'Researched application of Hug formula to RSU compensation; reviewed In re Marriage of Harrison for treatment of performance-based vesting conditions',
   'Legal Research', TRUE, 450, 'L110', 2, '2026-03-17T21:30:00Z', '2026-03-17T21:45:00Z', 'pending'),

  ('a-0317-5a', uid, 's-0317-5', 'nb-cle', 'Zoom', 'CLE Webinar: Custody Evaluation Standards Update', 30,
   'Attended continuing legal education webinar on updated California custody evaluation standards and recent amendments to Family Code section 3044 regarding rebuttable presumption against custody for DV perpetrators',
   'Administrative', FALSE, NULL, NULL, 0, '2026-03-17T22:00:00Z', '2026-03-17T22:30:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 18 (Wednesday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0318-1', uid, '2026-03-18T16:00:00Z', '2026-03-18T17:00:00Z', 'completed',
   'Drafted declaration opposing father''s relocation request in Thompson matter. Analyzed impact on children''s school enrollment and extracurricular activities.',
   '[{"name": "Document Drafting", "minutes": 38, "percentage": 63}, {"name": "Case Review", "minutes": 22, "percentage": 37}]'::jsonb,
   '[]'::jsonb, 'mt-thom-2'),

  ('s-0318-2', uid, '2026-03-18T17:15:00Z', '2026-03-18T18:30:00Z', 'completed',
   'Finalized motion to compel financial disclosures in Martinez dissolution. Reviewed opposing counsel''s initial response and identified deficiencies in production.',
   '[{"name": "Document Drafting", "minutes": 45, "percentage": 60}, {"name": "Case Review", "minutes": 30, "percentage": 40}]'::jsonb,
   '[]'::jsonb, 'mt-mart-1'),

  ('s-0318-3', uid, '2026-03-18T20:00:00Z', '2026-03-18T21:00:00Z', 'completed',
   'Analyzed Amit Patel''s income and expense declaration. Researched imputed income standards for involuntarily terminated tech employees in current market conditions.',
   '[{"name": "Case Review", "minutes": 28, "percentage": 47}, {"name": "Legal Research", "minutes": 32, "percentage": 53}]'::jsonb,
   '[]'::jsonb, 'mt-pate-1'),

  ('s-0318-4', uid, '2026-03-18T21:15:00Z', '2026-03-18T22:00:00Z', 'completed',
   'Prepared Rachel Davis for upcoming DVRO hearing. Reviewed testimony outline and anticipated cross-examination topics. Organized documentary evidence.',
   '[{"name": "Court & Hearings", "minutes": 28, "percentage": 62}, {"name": "Case Review", "minutes": 17, "percentage": 38}]'::jsonb,
   '[]'::jsonb, 'mt-davi-1'),

  ('s-0318-5', uid, '2026-03-18T22:15:00Z', '2026-03-18T22:45:00Z', 'completed',
   'Follow-up emails with referral contacts from Bay Area Family Law Section mixer. Updated CRM with new attorney contacts for potential cross-referrals.',
   '[{"name": "Administrative", "minutes": 30, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-bizdev');

  -- March 18 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0318-1a', uid, 's-0318-1', 'mt-thom-2', 'Microsoft Word', 'Declaration Opposing Relocation - Thompson.docx', 38,
   'Drafted responsive declaration opposing father''s relocation request to Portland; detailed children''s established ties to Berkeley community including school enrollment, soccer league, and proximity to maternal grandparents',
   'Document Drafting', TRUE, 375, 'A103', 0, '2026-03-18T16:00:00Z', '2026-03-18T16:38:00Z', 'pending'),
  ('a-0318-1b', uid, 's-0318-1', 'mt-thom-2', 'Adobe Acrobat', 'Thompson_School_Records_Exhibits.pdf', 22,
   'Reviewed and organized exhibit package for opposition including children''s school progress reports, attendance records, and teacher recommendation letters documenting academic and social development',
   'Case Review', TRUE, 375, 'A104', 1, '2026-03-18T16:38:00Z', '2026-03-18T17:00:00Z', 'pending'),

  ('a-0318-2a', uid, 's-0318-2', 'mt-mart-1', 'Microsoft Word', 'Motion to Compel - Martinez v Martinez FINAL.docx', 45,
   'Finalized motion to compel production of financial documents; incorporated meet and confer declaration and proposed order compelling production of Stripe equity statements, tax returns (2022-2025), and bank records within 20 days',
   'Document Drafting', TRUE, 450, 'A103', 0, '2026-03-18T17:15:00Z', '2026-03-18T18:00:00Z', 'pending'),
  ('a-0318-2b', uid, 's-0318-2', 'mt-mart-1', 'Adobe Acrobat', 'Whitfield_Response_Martinez_Discovery.pdf', 30,
   'Reviewed opposing counsel James Whitfield''s initial document production; identified significant deficiencies including missing brokerage statements for 2024-2025 and incomplete Stripe compensation records',
   'Case Review', TRUE, 450, 'A104', 1, '2026-03-18T18:00:00Z', '2026-03-18T18:30:00Z', 'pending'),

  ('a-0318-3a', uid, 's-0318-3', 'mt-pate-1', 'Microsoft Excel', 'Patel_Income_Expense_Analysis.xlsx', 28,
   'Analyzed Amit Patel''s current income and expense declaration; compared W-2 history ($285K at Meta) with current consulting income ($120K annually); calculated guideline support reduction under DissoMaster',
   'Case Review', TRUE, 350, 'A104', 0, '2026-03-18T20:00:00Z', '2026-03-18T20:28:00Z', 'pending'),
  ('a-0318-3b', uid, 's-0318-3', 'mt-pate-1', 'Westlaw', 'Search: imputed income involuntary termination California Family Code 4058', 32,
   'Researched imputed income standards under Family Code section 4058; reviewed In re Marriage of Bardzik regarding earning capacity imputation for involuntarily terminated employees; identified favorable authority on market-conditions defense in tech industry downturn',
   'Legal Research', TRUE, 350, 'L110', 1, '2026-03-18T20:28:00Z', '2026-03-18T21:00:00Z', 'pending'),

  ('a-0318-4a', uid, 's-0318-4', 'mt-davi-1', 'Zoom', 'Hearing prep with Rachel Davis', 28,
   'Prepared client for DVRO hearing testimony; reviewed chronology of incidents, practiced direct examination questions, and discussed anticipated cross-examination by respondent''s counsel on timeline discrepancies',
   'Court & Hearings', TRUE, 375, 'A101', 0, '2026-03-18T21:15:00Z', '2026-03-18T21:43:00Z', 'pending'),
  ('a-0318-4b', uid, 's-0318-4', 'mt-davi-1', 'Adobe Acrobat', 'Davis_DVRO_Exhibit_Binder.pdf', 17,
   'Organized and finalized exhibit binder for DVRO hearing including police report, photographs of injuries, threatening text message screenshots, and therapist declarations',
   'Case Review', TRUE, 375, 'L140', 1, '2026-03-18T21:43:00Z', '2026-03-18T22:00:00Z', 'pending'),

  ('a-0318-5a', uid, 's-0318-5', 'nb-bizdev', 'Microsoft Outlook', 'Referral follow-up emails', 18,
   'Sent follow-up emails to three attorneys met at Bay Area Family Law Section networking event; discussed potential cross-referral opportunities for complex divorce and adoption matters',
   'Administrative', FALSE, NULL, 'A102', 0, '2026-03-18T22:15:00Z', '2026-03-18T22:33:00Z', 'pending'),
  ('a-0318-5b', uid, 's-0318-5', 'nb-bizdev', 'Google Chrome', 'Clio CRM - Contact updates', 12,
   'Updated practice management CRM with new attorney contacts and referral source information from networking event',
   'Administrative', FALSE, NULL, 'A106', 1, '2026-03-18T22:33:00Z', '2026-03-18T22:45:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 19 (Thursday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0319-1', uid, '2026-03-19T15:30:00Z', '2026-03-19T17:00:00Z', 'completed',
   'Attended DVRO hearing at Santa Clara County Superior Court. Presented evidence of domestic violence pattern including testimony from client and documentary evidence. Court continued matter for further hearing on April 2.',
   '[{"name": "Court & Hearings", "minutes": 75, "percentage": 83}, {"name": "Document Drafting", "minutes": 15, "percentage": 17}]'::jsonb,
   '[]'::jsonb, 'mt-davi-1'),

  ('s-0319-2', uid, '2026-03-19T17:30:00Z', '2026-03-19T18:30:00Z', 'completed',
   'Call with forensic accountant Michael Torres regarding supplemental analysis on UCSF pension valuation. Reviewed updated community property tracing spreadsheet for Stripe equity.',
   '[{"name": "Client Communication", "minutes": 25, "percentage": 42}, {"name": "Case Review", "minutes": 35, "percentage": 58}]'::jsonb,
   '[]'::jsonb, 'mt-mart-3'),

  ('s-0319-3', uid, '2026-03-19T20:00:00Z', '2026-03-19T21:00:00Z', 'completed',
   'Continued drafting prenuptial agreement for Chen-Williams matter. Addressed separate property characterization provisions for pre-marital Google and Figma equity and sunset clause for spousal support waiver.',
   '[{"name": "Document Drafting", "minutes": 45, "percentage": 75}, {"name": "Legal Research", "minutes": 15, "percentage": 25}]'::jsonb,
   '[]'::jsonb, 'mt-chen-1'),

  ('s-0319-4', uid, '2026-03-19T21:15:00Z', '2026-03-19T22:00:00Z', 'completed',
   'Drafted I-600 orphan petition narrative for Okafor international adoption. Reviewed Nigerian court custody order and prepared supporting declaration detailing family circumstances.',
   '[{"name": "Document Drafting", "minutes": 30, "percentage": 67}, {"name": "Case Review", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-okaf-1'),

  ('s-0319-5', uid, '2026-03-19T22:15:00Z', '2026-03-19T23:00:00Z', 'completed',
   'Video call with Jessica Thompson to discuss strategy for opposing relocation request. Reviewed children''s school schedule and extracurricular commitments as evidence of established community ties.',
   '[{"name": "Client Communication", "minutes": 30, "percentage": 67}, {"name": "Case Review", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-thom-1');

  -- March 19 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0319-1a', uid, 's-0319-1', 'mt-davi-1', 'Google Chrome', 'Santa Clara County Superior Court - Dept 73', 75,
   'Attended DVRO hearing before Judge Morrison; presented client testimony and documentary evidence establishing pattern of domestic violence; opposing counsel requested continuance for further discovery; court extended TRO and set continued hearing for April 2, 2026',
   'Court & Hearings', TRUE, 375, 'L440', 0, '2026-03-19T15:30:00Z', '2026-03-19T16:45:00Z', 'pending'),
  ('a-0319-1b', uid, 's-0319-1', 'mt-davi-1', 'Microsoft Word', 'Post-Hearing Notes - Davis DVRO.docx', 15,
   'Drafted post-hearing memorandum documenting court''s rulings, continuance order, and preparation tasks for April 2 hearing including additional witness declarations',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-19T16:45:00Z', '2026-03-19T17:00:00Z', 'pending'),

  ('a-0319-2a', uid, 's-0319-2', 'mt-mart-3', 'Zoom', 'Call with Michael Torres - UCSF pension', 25,
   'Discussed supplemental forensic analysis of UCSF defined benefit pension present value calculation; reviewed Brown formula application and agreed on 5.5% discount rate; Torres to deliver updated report by March 25',
   'Client Communication', TRUE, 450, 'A102', 0, '2026-03-19T17:30:00Z', '2026-03-19T17:55:00Z', 'pending'),
  ('a-0319-2b', uid, 's-0319-2', 'mt-mart-3', 'Microsoft Excel', 'Martinez_Community_Property_Tracing.xlsx', 35,
   'Reviewed updated community property tracing spreadsheet for Stripe equity; verified separate property credits for pre-marital RSU grants and analyzed community interest in post-marital vesting tranches totaling approximately $1.8M',
   'Case Review', TRUE, 450, 'A104', 1, '2026-03-19T17:55:00Z', '2026-03-19T18:30:00Z', 'pending'),

  ('a-0319-3a', uid, 's-0319-3', 'mt-chen-1', 'Microsoft Word', 'Chen-Williams Prenuptial Agreement v2.docx', 45,
   'Continued drafting prenuptial agreement; addressed separate property characterization for pre-marital Google RSUs (David) and Figma equity (Sarah); drafted sunset clause providing spousal support waiver expires after 10 years of marriage; included provisions for treatment of jointly acquired real property',
   'Document Drafting', TRUE, 400, 'A103', 0, '2026-03-19T20:00:00Z', '2026-03-19T20:45:00Z', 'pending'),
  ('a-0319-3b', uid, 's-0319-3', 'mt-chen-1', 'Westlaw', 'Search: prenuptial agreement enforceability California unconscionability', 15,
   'Researched enforceability standards for prenuptial agreements under California Family Code section 1615; reviewed In re Marriage of Bonds for voluntariness requirements and independent counsel provisions',
   'Legal Research', TRUE, 400, 'L110', 1, '2026-03-19T20:45:00Z', '2026-03-19T21:00:00Z', 'pending'),

  ('a-0319-4a', uid, 's-0319-4', 'mt-okaf-1', 'Microsoft Word', 'I-600 Petition Narrative - Okafor.docx', 30,
   'Drafted I-600 orphan petition narrative detailing family circumstances, parental death, and uncle/aunt''s petition to adopt; described Chioma''s living situation in Lagos and the Okafor family''s home study approval',
   'Document Drafting', TRUE, 350, 'A103', 0, '2026-03-19T21:15:00Z', '2026-03-19T21:45:00Z', 'pending'),
  ('a-0319-4b', uid, 's-0319-4', 'mt-okaf-1', 'Adobe Acrobat', 'Lagos_High_Court_Custody_Order.pdf', 15,
   'Reviewed certified English translation of Lagos High Court custody order granting legal guardianship to Nkem Okafor; verified order meets USCIS requirements for orphan classification',
   'Case Review', TRUE, 350, 'A104', 1, '2026-03-19T21:45:00Z', '2026-03-19T22:00:00Z', 'pending'),

  ('a-0319-5a', uid, 's-0319-5', 'mt-thom-1', 'Zoom', 'Client meeting - Jessica Thompson', 30,
   'Video conference with client to discuss strategy for opposing ex-husband''s relocation to Portland; reviewed children''s school schedules, soccer league commitments, and grandmother''s childcare role as evidence of established community ties',
   'Client Communication', TRUE, 375, 'A102', 0, '2026-03-19T22:15:00Z', '2026-03-19T22:45:00Z', 'pending'),
  ('a-0319-5b', uid, 's-0319-5', 'mt-thom-1', 'Adobe Acrobat', 'Thompson_Children_Activities_Schedule.pdf', 15,
   'Reviewed compiled schedule of children''s extracurricular activities, medical providers, and social connections in Berkeley as supporting documentation for opposition to relocation',
   'Case Review', TRUE, 375, 'A104', 1, '2026-03-19T22:45:00Z', '2026-03-19T23:00:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 20 (Friday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0320-1', uid, '2026-03-20T16:00:00Z', '2026-03-20T17:00:00Z', 'completed',
   'Prepared for upcoming settlement conference in Martinez dissolution. Drafted settlement proposal with community property division framework and spousal support recommendations.',
   '[{"name": "Document Drafting", "minutes": 38, "percentage": 63}, {"name": "Case Review", "minutes": 22, "percentage": 37}]'::jsonb,
   '[]'::jsonb, 'mt-mart-1'),

  ('s-0320-2', uid, '2026-03-20T17:15:00Z', '2026-03-20T18:00:00Z', 'completed',
   'Drafted motion to modify child support in Patel matter incorporating income change documentation and DissoMaster calculations showing reduced guideline amount.',
   '[{"name": "Document Drafting", "minutes": 30, "percentage": 67}, {"name": "Case Review", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-pate-1'),

  ('s-0320-3', uid, '2026-03-20T18:15:00Z', '2026-03-20T19:00:00Z', 'completed',
   'Pro bono consultation at Legal Aid Society intake clinic. Advised unrepresented domestic violence survivor on protective order process and connected with shelter resources.',
   '[{"name": "Client Communication", "minutes": 30, "percentage": 67}, {"name": "Administrative", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'nb-probono'),

  ('s-0320-4', uid, '2026-03-20T20:30:00Z', '2026-03-20T21:30:00Z', 'completed',
   'Researched emergency custody modification standards in Davis matter. Reviewed FC section 3064 requirements for ex parte orders and prepared supplemental declaration.',
   '[{"name": "Legal Research", "minutes": 35, "percentage": 58}, {"name": "Document Drafting", "minutes": 25, "percentage": 42}]'::jsonb,
   '[]'::jsonb, 'mt-davi-2'),

  ('s-0320-5', uid, '2026-03-20T21:45:00Z', '2026-03-20T22:15:00Z', 'completed',
   'End-of-week billing review and time entry finalization. Reviewed outstanding invoices and followed up on two overdue accounts.',
   '[{"name": "Administrative", "minutes": 30, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-admin');

  -- March 20 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0320-1a', uid, 's-0320-1', 'mt-mart-1', 'Microsoft Word', 'Martinez Settlement Proposal Draft.docx', 38,
   'Drafted comprehensive settlement proposal addressing community property division including Stripe RSU allocation, UCSF pension QDRO, real property (Pacific Heights residence), and proposed Gavron warning spousal support step-down schedule',
   'Document Drafting', TRUE, 450, 'A103', 0, '2026-03-20T16:00:00Z', '2026-03-20T16:38:00Z', 'pending'),
  ('a-0320-1b', uid, 's-0320-1', 'mt-mart-1', 'Microsoft Excel', 'Martinez_Asset_Division_Summary.xlsx', 22,
   'Reviewed and updated community property balance sheet summarizing all identified assets, characterization positions, and proposed division allocations totaling approximately $8.2M community estate',
   'Case Review', TRUE, 450, 'A104', 1, '2026-03-20T16:38:00Z', '2026-03-20T17:00:00Z', 'pending'),

  ('a-0320-2a', uid, 's-0320-2', 'mt-pate-1', 'Microsoft Word', 'Motion to Modify Child Support - Patel.docx', 30,
   'Drafted motion to modify child support based on material change in circumstances; documented involuntary termination from Meta, good-faith job search efforts, and current consulting income; attached DissoMaster printout showing reduced guideline amount',
   'Document Drafting', TRUE, 350, 'A103', 0, '2026-03-20T17:15:00Z', '2026-03-20T17:45:00Z', 'pending'),
  ('a-0320-2b', uid, 's-0320-2', 'mt-pate-1', 'Google Chrome', 'DissoMaster Online - Patel calculation', 15,
   'Ran updated DissoMaster calculation using current income figures; guideline support reduced from $4,200/month to $2,850/month based on changed income differential',
   'Case Review', TRUE, 350, 'A104', 1, '2026-03-20T17:45:00Z', '2026-03-20T18:00:00Z', 'pending'),

  ('a-0320-3a', uid, 's-0320-3', 'nb-probono', 'Zoom', 'Legal Aid Society - Intake Consultation', 30,
   'Pro bono intake consultation with domestic violence survivor seeking guidance on restraining order process; explained DVRO procedure, temporary vs. permanent orders, and courthouse safety planning',
   'Client Communication', FALSE, NULL, 'A102', 0, '2026-03-20T18:15:00Z', '2026-03-20T18:45:00Z', 'pending'),
  ('a-0320-3b', uid, 's-0320-3', 'nb-probono', 'Microsoft Outlook', 'Referral to Next Door Solutions', 15,
   'Prepared referral to Next Door Solutions shelter program and compiled list of community legal resources for unrepresented litigant; sent warm introduction email to intake coordinator',
   'Administrative', FALSE, NULL, 'A106', 1, '2026-03-20T18:45:00Z', '2026-03-20T19:00:00Z', 'pending'),

  ('a-0320-4a', uid, 's-0320-4', 'mt-davi-2', 'LexisNexis', 'Search: FC 3064 ex parte custody modification standards', 35,
   'Researched requirements for ex parte custody modification under Family Code section 3064; reviewed showing of immediate harm standard and notice requirements; identified supporting authority in In re Marriage of Condon',
   'Legal Research', TRUE, 375, 'L110', 0, '2026-03-20T20:30:00Z', '2026-03-20T21:05:00Z', 'pending'),
  ('a-0320-4b', uid, 's-0320-4', 'mt-davi-2', 'Microsoft Word', 'Supplemental Declaration - Davis Custody.docx', 25,
   'Drafted supplemental declaration in support of emergency custody order documenting respondent''s recent violations of TRO and additional evidence of risk to children''s safety',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-20T21:05:00Z', '2026-03-20T21:30:00Z', 'pending'),

  ('a-0320-5a', uid, 's-0320-5', 'nb-admin', 'Google Chrome', 'Clio - Weekly billing review', 20,
   'Reviewed and finalized weekly time entries across all active matters; verified narrative descriptions meet billing guidelines and minimum increment standards',
   'Administrative', FALSE, NULL, 'A106', 0, '2026-03-20T21:45:00Z', '2026-03-20T22:05:00Z', 'pending'),
  ('a-0320-5b', uid, 's-0320-5', 'nb-admin', 'Microsoft Outlook', 'Invoice follow-up - overdue accounts', 10,
   'Sent follow-up correspondence regarding two overdue invoices totaling $12,450; updated accounts receivable tracking spreadsheet',
   'Administrative', FALSE, NULL, 'A102', 1, '2026-03-20T22:05:00Z', '2026-03-20T22:15:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 23 (Monday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0323-1', uid, '2026-03-23T16:00:00Z', '2026-03-23T17:15:00Z', 'completed',
   'Researched community property division standards for stock options granted during marriage but vesting post-separation. Drafted meet and confer letter to opposing counsel regarding deficient financial disclosures.',
   '[{"name": "Legal Research", "minutes": 42, "percentage": 56}, {"name": "Document Drafting", "minutes": 33, "percentage": 44}]'::jsonb,
   '[]'::jsonb, 'mt-mart-1'),

  ('s-0323-2', uid, '2026-03-23T17:30:00Z', '2026-03-23T18:15:00Z', 'completed',
   'Client call with Rachel Davis reviewing safety plan updates and DVRO hearing preparation. Drafted supplemental declaration addressing respondent''s recent social media posts.',
   '[{"name": "Client Communication", "minutes": 25, "percentage": 56}, {"name": "Document Drafting", "minutes": 20, "percentage": 44}]'::jsonb,
   '[]'::jsonb, 'mt-davi-1'),

  ('s-0323-3', uid, '2026-03-23T18:30:00Z', '2026-03-23T19:00:00Z', 'completed',
   'Reviewed David Chen''s updated asset schedule with new stock grant information. Emailed Rebecca Stein regarding prenup negotiation timeline and disclosure completeness.',
   '[{"name": "Case Review", "minutes": 18, "percentage": 60}, {"name": "Client Communication", "minutes": 12, "percentage": 40}]'::jsonb,
   '[]'::jsonb, 'mt-chen-1'),

  ('s-0323-4', uid, '2026-03-23T20:30:00Z', '2026-03-23T22:00:00Z', 'completed',
   'Attended mediation session for Martinez custody matter via Zoom with mediator Sandra Wells. Made progress on holiday schedule and summer parenting time. Revised parenting plan draft based on mediation outcomes.',
   '[{"name": "Court & Hearings", "minutes": 55, "percentage": 61}, {"name": "Document Drafting", "minutes": 35, "percentage": 39}]'::jsonb,
   '[]'::jsonb, 'mt-mart-2'),

  ('s-0323-5', uid, '2026-03-23T22:15:00Z', '2026-03-23T22:45:00Z', 'completed',
   'Updated filing deadlines calendar and organized case files for the week. Reviewed tomorrow''s court schedule and client meeting agenda.',
   '[{"name": "Administrative", "minutes": 30, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-admin');

  -- March 23 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0323-1a', uid, 's-0323-1', 'mt-mart-1', 'Westlaw', 'Search: stock options vesting post-separation community property', 42,
   'Researched community property characterization of stock options granted during marriage but vesting after date of separation; reviewed In re Marriage of Nelson and time-rule allocation formula; identified authority supporting client''s position on Stripe RSU characterization',
   'Legal Research', TRUE, 450, 'L110', 0, '2026-03-23T16:00:00Z', '2026-03-23T16:42:00Z', 'pending'),
  ('a-0323-1b', uid, 's-0323-1', 'mt-mart-1', 'Microsoft Word', 'Meet and Confer Letter - Martinez Discovery.docx', 33,
   'Drafted meet and confer letter to opposing counsel James Whitfield detailing specific deficiencies in financial disclosure responses and demanding supplemental production within 10 days before filing motion to compel',
   'Document Drafting', TRUE, 450, 'A103', 1, '2026-03-23T16:42:00Z', '2026-03-23T17:15:00Z', 'pending'),

  ('a-0323-2a', uid, 's-0323-2', 'mt-davi-1', 'Zoom', 'Call with Rachel Davis - hearing prep', 25,
   'Reviewed safety plan implementation with client; discussed DVRO hearing preparation including witness availability and documentary evidence organization; addressed client''s concerns about respondent''s recent threatening social media activity',
   'Client Communication', TRUE, 375, 'A102', 0, '2026-03-23T17:30:00Z', '2026-03-23T17:55:00Z', 'pending'),
  ('a-0323-2b', uid, 's-0323-2', 'mt-davi-1', 'Microsoft Word', 'Supplemental Declaration - Davis Social Media.docx', 20,
   'Drafted supplemental declaration documenting respondent''s recent social media posts containing veiled threats and attempts to locate petitioner; attached authenticated screenshots as exhibits',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-23T17:55:00Z', '2026-03-23T18:15:00Z', 'pending'),

  ('a-0323-3a', uid, 's-0323-3', 'mt-chen-1', 'Microsoft Excel', 'Chen_Updated_Asset_Schedule_March.xlsx', 18,
   'Reviewed David Chen''s updated asset disclosure reflecting new Google RSU grant received March 2026; recalculated separate property totals and identified new disclosure items for prenup negotiations',
   'Case Review', TRUE, 400, 'A104', 0, '2026-03-23T18:30:00Z', '2026-03-23T18:48:00Z', 'pending'),
  ('a-0323-3b', uid, 's-0323-3', 'mt-chen-1', 'Microsoft Outlook', 'Email to Rebecca Stein - negotiation timeline', 12,
   'Emailed opposing independent counsel regarding updated disclosure, proposed negotiation timeline, and scheduling of four-way meeting for prenup terms discussion',
   'Client Communication', TRUE, 400, 'A102', 1, '2026-03-23T18:48:00Z', '2026-03-23T19:00:00Z', 'pending'),

  ('a-0323-4a', uid, 's-0323-4', 'mt-mart-2', 'Zoom', 'Mediation - Sandra Wells, Mediator', 55,
   'Attended custody mediation session with mediator Sandra Wells; reached tentative agreement on holiday rotation schedule and two-week summer parenting blocks; remaining disputes on school-year weeknight overnights and right of first refusal',
   'Court & Hearings', TRUE, 450, 'A101', 0, '2026-03-23T20:30:00Z', '2026-03-23T21:25:00Z', 'pending'),
  ('a-0323-4b', uid, 's-0323-4', 'mt-mart-2', 'Microsoft Word', 'Martinez Parenting Plan v3 - Post Mediation.docx', 35,
   'Revised parenting plan incorporating mediation outcomes including agreed-upon holiday rotation (alternating Thanksgiving/Christmas), summer schedule (two consecutive weeks each parent), and transportation exchange provisions',
   'Document Drafting', TRUE, 450, 'A103', 1, '2026-03-23T21:25:00Z', '2026-03-23T22:00:00Z', 'pending'),

  ('a-0323-5a', uid, 's-0323-5', 'nb-admin', 'Google Chrome', 'Google Calendar - Weekly planning', 18,
   'Updated master calendar with filing deadlines for Martinez motion to compel, Davis DVRO continued hearing, and Patel child support modification; blocked preparation time for each',
   'Administrative', FALSE, NULL, 'A106', 0, '2026-03-23T22:15:00Z', '2026-03-23T22:33:00Z', 'pending'),
  ('a-0323-5b', uid, 's-0323-5', 'nb-admin', 'Google Chrome', 'Clio - Case file organization', 12,
   'Organized digital case files and updated matter status notes for all active family law matters; filed recent correspondence and court orders',
   'Administrative', FALSE, NULL, 'A106', 1, '2026-03-23T22:33:00Z', '2026-03-23T22:45:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 24 (Tuesday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0324-1', uid, '2026-03-24T16:00:00Z', '2026-03-24T17:00:00Z', 'completed',
   'Drafted trial brief on best-interest factors for Thompson custody modification. Analyzed LaMusga factors with emphasis on stability and continuity of children''s current living arrangement.',
   '[{"name": "Document Drafting", "minutes": 38, "percentage": 63}, {"name": "Legal Research", "minutes": 22, "percentage": 37}]'::jsonb,
   '[]'::jsonb, 'mt-thom-1'),

  ('s-0324-2', uid, '2026-03-24T17:15:00Z', '2026-03-24T18:15:00Z', 'completed',
   'Coordinated with Holt International regarding home study update for Okafor adoption. Reviewed draft I-171H application and prepared supporting documentation packet.',
   '[{"name": "Client Communication", "minutes": 25, "percentage": 42}, {"name": "Document Drafting", "minutes": 20, "percentage": 33}, {"name": "Case Review", "minutes": 15, "percentage": 25}]'::jsonb,
   '[]'::jsonb, 'mt-okaf-1'),

  ('s-0324-3', uid, '2026-03-24T18:30:00Z', '2026-03-24T19:15:00Z', 'completed',
   'Researched treatment of stock option appreciation during marriage for Martinez property division. Analyzed In re Marriage of Cheriton for Silicon Valley equity compensation valuation principles.',
   '[{"name": "Legal Research", "minutes": 30, "percentage": 67}, {"name": "Case Review", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-mart-3'),

  ('s-0324-4', uid, '2026-03-24T20:30:00Z', '2026-03-24T21:30:00Z', 'completed',
   'Attended temporary custody status hearing in Davis matter via Zoom. Court confirmed supervised visitation schedule and ordered respondent to complete batterer''s intervention program.',
   '[{"name": "Court & Hearings", "minutes": 45, "percentage": 75}, {"name": "Document Drafting", "minutes": 15, "percentage": 25}]'::jsonb,
   '[]'::jsonb, 'mt-davi-2'),

  ('s-0324-5', uid, '2026-03-24T21:45:00Z', '2026-03-24T22:30:00Z', 'completed',
   'Reviewed opposing party''s responsive declaration in Patel child support modification. Analyzed imputed income arguments and identified weaknesses in opposing counsel''s earning capacity analysis.',
   '[{"name": "Case Review", "minutes": 30, "percentage": 67}, {"name": "Document Drafting", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-pate-1');

  -- March 24 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0324-1a', uid, 's-0324-1', 'mt-thom-1', 'Microsoft Word', 'Trial Brief - Thompson Best Interest Factors.docx', 38,
   'Drafted trial brief analyzing best-interest-of-child factors under Family Code section 3011 as applied to relocation request; emphasized children''s academic progress at current school, involvement in community sports leagues, and proximity to maternal extended family',
   'Document Drafting', TRUE, 375, 'A103', 0, '2026-03-24T16:00:00Z', '2026-03-24T16:38:00Z', 'pending'),
  ('a-0324-1b', uid, 's-0324-1', 'mt-thom-1', 'LexisNexis', 'Search: LaMusga factors stability children relocation 2025', 22,
   'Researched recent appellate decisions applying LaMusga factors; identified In re Marriage of Brown (2025) where court denied relocation based on children''s established educational and social ties similar to Thompson facts',
   'Legal Research', TRUE, 375, 'L110', 1, '2026-03-24T16:38:00Z', '2026-03-24T17:00:00Z', 'pending'),

  ('a-0324-2a', uid, 's-0324-2', 'mt-okaf-1', 'Zoom', 'Call with Holt International - home study update', 25,
   'Coordinated with Holt International adoption agency regarding home study update requirements; confirmed post-placement reporting schedule and discussed timeline for USCIS approval of I-171H',
   'Client Communication', TRUE, 350, 'A102', 0, '2026-03-24T17:15:00Z', '2026-03-24T17:40:00Z', 'pending'),
  ('a-0324-2b', uid, 's-0324-2', 'mt-okaf-1', 'Microsoft Word', 'I-171H Application Packet - Okafor.docx', 20,
   'Prepared I-171H advance processing application including cover letter, supporting declarations, and documentation checklist for USCIS filing',
   'Document Drafting', TRUE, 350, 'A103', 1, '2026-03-24T17:40:00Z', '2026-03-24T18:00:00Z', 'pending'),
  ('a-0324-2c', uid, 's-0324-2', 'mt-okaf-1', 'Adobe Acrobat', 'Holt_Home_Study_Update_March2026.pdf', 15,
   'Reviewed updated home study report from Holt International confirming Okafor family continues to meet all adoption suitability requirements; verified all supporting documents are current',
   'Case Review', TRUE, 350, 'A104', 2, '2026-03-24T18:00:00Z', '2026-03-24T18:15:00Z', 'pending'),

  ('a-0324-3a', uid, 's-0324-3', 'mt-mart-3', 'Westlaw', 'Search: stock option appreciation during marriage Cheriton', 30,
   'Researched treatment of stock option value appreciation during marriage; analyzed In re Marriage of Cheriton (2001) 92 Cal.App.4th 269 regarding Silicon Valley equity compensation valuation; reviewed apportionment methods for community vs. separate property interests',
   'Legal Research', TRUE, 450, 'L110', 0, '2026-03-24T18:30:00Z', '2026-03-24T19:00:00Z', 'pending'),
  ('a-0324-3b', uid, 's-0324-3', 'mt-mart-3', 'Microsoft Excel', 'Martinez_Stock_Option_Valuation.xlsx', 15,
   'Reviewed Stripe stock option exercise history and current fair market value estimates; prepared community property interest calculation using time-rule formula for options granted during marriage',
   'Case Review', TRUE, 450, 'A104', 1, '2026-03-24T19:00:00Z', '2026-03-24T19:15:00Z', 'pending'),

  ('a-0324-4a', uid, 's-0324-4', 'mt-davi-2', 'Zoom', 'Davis Temporary Custody Hearing - Dept 73', 45,
   'Attended temporary custody status hearing before Judge Morrison via Zoom; court confirmed supervised visitation schedule (Saturday afternoons at monitored exchange center), ordered respondent to enroll in 52-week batterer''s intervention program within 30 days',
   'Court & Hearings', TRUE, 375, 'L440', 0, '2026-03-24T20:30:00Z', '2026-03-24T21:15:00Z', 'pending'),
  ('a-0324-4b', uid, 's-0324-4', 'mt-davi-2', 'Microsoft Word', 'Davis Hearing Order Summary.docx', 15,
   'Drafted summary of court''s custody orders for client records including supervised visitation terms, BIP enrollment deadline, and next court date; emailed summary to client and DV advocate',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-24T21:15:00Z', '2026-03-24T21:30:00Z', 'pending'),

  ('a-0324-5a', uid, 's-0324-5', 'mt-pate-1', 'Adobe Acrobat', 'West_Response_Patel_Support_Mod.pdf', 30,
   'Reviewed Karen West''s responsive declaration opposing child support modification; analyzed imputed income arguments and identified factual weaknesses including outdated salary survey data and failure to account for tech industry layoff trends',
   'Case Review', TRUE, 350, 'A104', 0, '2026-03-24T21:45:00Z', '2026-03-24T22:15:00Z', 'pending'),
  ('a-0324-5b', uid, 's-0324-5', 'mt-pate-1', 'Microsoft Word', 'Patel Reply Points and Authorities.docx', 15,
   'Began drafting reply brief addressing opposing counsel''s earning capacity imputation arguments; outlined rebuttal points regarding good-faith job search documentation and current market conditions in tech sector',
   'Document Drafting', TRUE, 350, 'A103', 1, '2026-03-24T22:15:00Z', '2026-03-24T22:30:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 25 (Wednesday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0325-1', uid, '2026-03-25T15:45:00Z', '2026-03-25T16:45:00Z', 'completed',
   'Researched recent appellate decisions on custody modification standards. Drafted points and authorities in support of Thompson custody modification opposition.',
   '[{"name": "Legal Research", "minutes": 38, "percentage": 63}, {"name": "Document Drafting", "minutes": 22, "percentage": 37}]'::jsonb,
   '[]'::jsonb, 'mt-thom-1'),

  ('s-0325-2', uid, '2026-03-25T17:00:00Z', '2026-03-25T18:30:00Z', 'completed',
   'Reviewed Michael Torres'' final forensic accounting report on Martinez property division. Called Torres to discuss discrepancy in Stripe RSU vesting schedule. Began drafting property division brief.',
   '[{"name": "Case Review", "minutes": 45, "percentage": 50}, {"name": "Client Communication", "minutes": 20, "percentage": 22}, {"name": "Document Drafting", "minutes": 25, "percentage": 28}]'::jsonb,
   '[]'::jsonb, 'mt-mart-3'),

  ('s-0325-3', uid, '2026-03-25T20:00:00Z', '2026-03-25T21:00:00Z', 'completed',
   'Reviewed updated USCIS forms for Okafor adoption filing. Emailed adoption agency regarding documentation timeline. Continued drafting I-600 supporting narrative.',
   '[{"name": "Case Review", "minutes": 30, "percentage": 50}, {"name": "Client Communication", "minutes": 15, "percentage": 25}, {"name": "Document Drafting", "minutes": 15, "percentage": 25}]'::jsonb,
   '[]'::jsonb, 'mt-okaf-1'),

  ('s-0325-4', uid, '2026-03-25T21:30:00Z', '2026-03-25T22:30:00Z', 'completed',
   'Attended emergency hearing for Davis custody matter. Court granted extended supervised visitation parameters and ordered respondent to surrender firearms within 48 hours.',
   '[{"name": "Court & Hearings", "minutes": 45, "percentage": 75}, {"name": "Document Drafting", "minutes": 15, "percentage": 25}]'::jsonb,
   '[]'::jsonb, 'mt-davi-2'),

  ('s-0325-5', uid, '2026-03-25T23:00:00Z', '2026-03-25T23:30:00Z', 'completed',
   'Attended webinar on recent changes to California domestic violence statutes and new evidentiary standards for electronic evidence in family law proceedings.',
   '[{"name": "Administrative", "minutes": 30, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-cle');

  -- March 25 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0325-1a', uid, 's-0325-1', 'mt-thom-1', 'LexisNexis', 'Search: custody modification changed circumstances 2025 California', 38,
   'Researched changed circumstances standard for custody modification under Montenegro v. Diaz; reviewed recent appellate authority on burden of proof for relocation requests when existing custody order reflects best interests finding',
   'Legal Research', TRUE, 375, 'L110', 0, '2026-03-25T15:45:00Z', '2026-03-25T16:23:00Z', 'pending'),
  ('a-0325-1b', uid, 's-0325-1', 'mt-thom-1', 'Microsoft Word', 'Thompson P&A Opposition to Relocation.docx', 22,
   'Drafted points and authorities in support of opposition to relocation; cited Montenegro standard and distinguished moving party''s cited cases on facts relating to children''s community connections',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-25T16:23:00Z', '2026-03-25T16:45:00Z', 'pending'),

  ('a-0325-2a', uid, 's-0325-2', 'mt-mart-3', 'Adobe Acrobat', 'BDO_Martinez_Final_Forensic_Report.pdf', 45,
   'Reviewed Michael Torres'' final forensic accounting report including community property tracing analysis, Stripe RSU valuation ($2.1M community interest), UCSF pension present value ($890K), and proposed equalization payment calculations',
   'Case Review', TRUE, 450, 'A104', 0, '2026-03-25T17:00:00Z', '2026-03-25T17:45:00Z', 'pending'),
  ('a-0325-2b', uid, 's-0325-2', 'mt-mart-3', 'Zoom', 'Call with Michael Torres - RSU discrepancy', 20,
   'Discussed discrepancy in Stripe RSU vesting schedule between company records and opposing party''s disclosure; Torres confirmed $340K undervaluation in opposing party''s characterization; agreed on correction methodology',
   'Client Communication', TRUE, 450, 'A102', 1, '2026-03-25T17:45:00Z', '2026-03-25T18:05:00Z', 'pending'),
  ('a-0325-2c', uid, 's-0325-2', 'mt-mart-3', 'Microsoft Word', 'Martinez Property Division Brief Draft.docx', 25,
   'Began drafting property division trial brief addressing community property characterization of Stripe equity compensation, UCSF pension, and Pacific Heights residence; outlined argument for equal division with RSU offset',
   'Document Drafting', TRUE, 450, 'A103', 2, '2026-03-25T18:05:00Z', '2026-03-25T18:30:00Z', 'pending'),

  ('a-0325-3a', uid, 's-0325-3', 'mt-okaf-1', 'Google Chrome', 'USCIS - I-600 Filing Requirements Update', 30,
   'Reviewed updated USCIS filing requirements and fee schedule for I-600 petition; confirmed all supporting documents meet current standards; verified Nigerian custody order apostille is properly formatted',
   'Case Review', TRUE, 350, 'A104', 0, '2026-03-25T20:00:00Z', '2026-03-25T20:30:00Z', 'pending'),
  ('a-0325-3b', uid, 's-0325-3', 'mt-okaf-1', 'Microsoft Outlook', 'Email to Holt International - documentation timeline', 15,
   'Emailed adoption agency case worker regarding remaining documentation requirements and estimated timeline for USCIS adjudication; requested updated medical examination results for Chioma',
   'Client Communication', TRUE, 350, 'A102', 1, '2026-03-25T20:30:00Z', '2026-03-25T20:45:00Z', 'pending'),
  ('a-0325-3c', uid, 's-0325-3', 'mt-okaf-1', 'Microsoft Word', 'I-600 Supporting Narrative v2 - Okafor.docx', 15,
   'Continued drafting I-600 supporting narrative addressing orphan classification requirements and family reunification justification; incorporated details from updated home study',
   'Document Drafting', TRUE, 350, 'A103', 2, '2026-03-25T20:45:00Z', '2026-03-25T21:00:00Z', 'pending'),

  ('a-0325-4a', uid, 's-0325-4', 'mt-davi-2', 'Zoom', 'Davis Emergency Custody Hearing - Dept 73', 45,
   'Attended emergency hearing on respondent''s TRO violation; presented evidence of unauthorized contact attempts; court expanded protective order to include children''s school and ordered respondent to surrender registered firearms within 48 hours',
   'Court & Hearings', TRUE, 375, 'L440', 0, '2026-03-25T21:30:00Z', '2026-03-25T22:15:00Z', 'pending'),
  ('a-0325-4b', uid, 's-0325-4', 'mt-davi-2', 'Microsoft Word', 'Davis Emergency Hearing Order.docx', 15,
   'Drafted proposed order reflecting court''s emergency rulings including expanded no-contact provisions, firearms surrender order, and school notification requirements; submitted to court for signature',
   'Document Drafting', TRUE, 375, 'A103', 1, '2026-03-25T22:15:00Z', '2026-03-25T22:30:00Z', 'pending'),

  ('a-0325-5a', uid, 's-0325-5', 'nb-cle', 'Zoom', 'CLE: DV Statute Changes & Electronic Evidence', 30,
   'Attended CLE webinar on Senate Bill 1141 changes to California domestic violence statutes and new standards for authenticating electronic communications evidence in family law proceedings',
   'Administrative', FALSE, NULL, NULL, 0, '2026-03-25T23:00:00Z', '2026-03-25T23:30:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 26 (Thursday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0326-1', uid, '2026-03-26T16:00:00Z', '2026-03-26T17:30:00Z', 'completed',
   'Client meeting with Roberto Martinez to discuss settlement options and forensic accounting findings. Drafted settlement counter-proposal incorporating updated asset valuations.',
   '[{"name": "Client Communication", "minutes": 35, "percentage": 39}, {"name": "Document Drafting", "minutes": 30, "percentage": 33}, {"name": "Case Review", "minutes": 25, "percentage": 28}]'::jsonb,
   '[]'::jsonb, 'mt-mart-1'),

  ('s-0326-2', uid, '2026-03-26T17:45:00Z', '2026-03-26T18:30:00Z', 'completed',
   'Four-way call with David Chen, Sarah Williams, and independent counsel Rebecca Stein to negotiate prenuptial agreement terms. Discussed treatment of future equity grants and spousal support provisions.',
   '[{"name": "Client Communication", "minutes": 35, "percentage": 78}, {"name": "Document Drafting", "minutes": 10, "percentage": 22}]'::jsonb,
   '[]'::jsonb, 'mt-chen-1'),

  ('s-0326-3', uid, '2026-03-26T20:00:00Z', '2026-03-26T21:00:00Z', 'completed',
   'Filed responsive declaration and points and authorities opposing Thompson relocation request. Uploaded exhibits to court e-filing portal.',
   '[{"name": "Document Drafting", "minutes": 35, "percentage": 58}, {"name": "Administrative", "minutes": 25, "percentage": 42}]'::jsonb,
   '[]'::jsonb, 'mt-thom-2'),

  ('s-0326-4', uid, '2026-03-26T21:15:00Z', '2026-03-26T22:15:00Z', 'completed',
   'Finalized exhibit binder for Davis DVRO hearing. Prepared client testimony outline and organized witness contact information for subpoenas.',
   '[{"name": "Case Review", "minutes": 35, "percentage": 58}, {"name": "Court & Hearings", "minutes": 25, "percentage": 42}]'::jsonb,
   '[]'::jsonb, 'mt-davi-1'),

  ('s-0326-5', uid, '2026-03-26T22:30:00Z', '2026-03-26T23:00:00Z', 'completed',
   'Follow-up calls with two attorneys who attended ACFLS presentation regarding referral opportunities for complex divorce and international adoption cases.',
   '[{"name": "Administrative", "minutes": 30, "percentage": 100}]'::jsonb,
   '[]'::jsonb, 'nb-bizdev');

  -- March 26 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0326-1a', uid, 's-0326-1', 'mt-mart-1', 'Zoom', 'Client meeting - Roberto Martinez', 35,
   'Met with Roberto Martinez to review forensic accounting findings and discuss settlement strategy; presented community property characterization analysis showing $8.2M estate; discussed potential settlement ranges and litigation risk assessment',
   'Client Communication', TRUE, 450, 'A102', 0, '2026-03-26T16:00:00Z', '2026-03-26T16:35:00Z', 'pending'),
  ('a-0326-1b', uid, 's-0326-1', 'mt-mart-1', 'Microsoft Word', 'Martinez Settlement Counter-Proposal v2.docx', 30,
   'Drafted settlement counter-proposal incorporating updated BDO forensic accounting valuations; proposed 55/45 property division with client retaining Stripe RSUs subject to equalization payment; addressed spousal support term and step-down schedule',
   'Document Drafting', TRUE, 450, 'A103', 1, '2026-03-26T16:35:00Z', '2026-03-26T17:05:00Z', 'pending'),
  ('a-0326-1c', uid, 's-0326-1', 'mt-mart-1', 'Microsoft Excel', 'Martinez_Settlement_Scenarios.xlsx', 25,
   'Reviewed three settlement scenario models comparing tax implications of different asset allocation approaches; analyzed capital gains impact of RSU vs. pension division options',
   'Case Review', TRUE, 450, 'A104', 2, '2026-03-26T17:05:00Z', '2026-03-26T17:30:00Z', 'pending'),

  ('a-0326-2a', uid, 's-0326-2', 'mt-chen-1', 'Zoom', 'Four-way prenup negotiation call', 35,
   'Participated in four-way negotiation call with David Chen, Sarah Williams, and Rebecca Stein (independent counsel); reached agreement on separate property characterization for pre-marital equity; discussed sunset clause terms — parties agreed to 7-year sunset on spousal support waiver',
   'Client Communication', TRUE, 400, 'A102', 0, '2026-03-26T17:45:00Z', '2026-03-26T18:20:00Z', 'pending'),
  ('a-0326-2b', uid, 's-0326-2', 'mt-chen-1', 'Microsoft Word', 'Chen-Williams Negotiation Notes.docx', 10,
   'Documented negotiation outcomes and remaining open items including treatment of jointly purchased real property during marriage and life insurance beneficiary designations',
   'Document Drafting', TRUE, 400, 'A103', 1, '2026-03-26T18:20:00Z', '2026-03-26T18:30:00Z', 'pending'),

  ('a-0326-3a', uid, 's-0326-3', 'mt-thom-2', 'Microsoft Word', 'Thompson Response to Relocation FINAL.docx', 35,
   'Finalized responsive declaration and points and authorities opposing relocation request; incorporated all exhibits including school records, extracurricular schedules, and expert declarations on relocation impact',
   'Document Drafting', TRUE, 375, 'A103', 0, '2026-03-26T20:00:00Z', '2026-03-26T20:35:00Z', 'pending'),
  ('a-0326-3b', uid, 's-0326-3', 'mt-thom-2', 'Google Chrome', 'Odyssey - Court e-filing portal', 25,
   'Filed responsive declaration, points and authorities, and exhibit volume with Alameda County Superior Court via Odyssey e-filing system; confirmed filing acceptance and served opposing counsel electronically',
   'Administrative', TRUE, 375, 'A106', 1, '2026-03-26T20:35:00Z', '2026-03-26T21:00:00Z', 'pending'),

  ('a-0326-4a', uid, 's-0326-4', 'mt-davi-1', 'Adobe Acrobat', 'Davis_DVRO_Final_Exhibit_Binder.pdf', 35,
   'Finalized comprehensive exhibit binder for April 2 DVRO hearing including police reports, medical records, authenticated text messages, social media screenshots, therapist declarations, and respondent''s prior DV incident documentation',
   'Case Review', TRUE, 375, 'L140', 0, '2026-03-26T21:15:00Z', '2026-03-26T21:50:00Z', 'pending'),
  ('a-0326-4b', uid, 's-0326-4', 'mt-davi-1', 'Microsoft Word', 'Davis Testimony Outline - April 2 Hearing.docx', 25,
   'Prepared detailed testimony outline for client''s direct examination at DVRO hearing; organized chronological narrative of abuse pattern with specific dates and documentary support for each incident',
   'Court & Hearings', TRUE, 375, 'A101', 1, '2026-03-26T21:50:00Z', '2026-03-26T22:15:00Z', 'pending'),

  ('a-0326-5a', uid, 's-0326-5', 'nb-bizdev', 'Zoom', 'Referral calls - ACFLS contacts', 20,
   'Follow-up calls with two family law attorneys from ACFLS presentation regarding mutual referral opportunities; one specializes in international custody matters and is referring a potential adoption case',
   'Administrative', FALSE, NULL, 'A102', 0, '2026-03-26T22:30:00Z', '2026-03-26T22:50:00Z', 'pending'),
  ('a-0326-5b', uid, 's-0326-5', 'nb-bizdev', 'Microsoft Outlook', 'Referral thank-you emails', 10,
   'Sent thank-you emails and firm capability summaries to new referral contacts; updated CRM with referral source tracking',
   'Administrative', FALSE, NULL, 'A106', 1, '2026-03-26T22:50:00Z', '2026-03-26T23:00:00Z', 'pending');


  -- ────────────────────────────────────────────────────────────
  -- MARCH 27 (Friday)
  -- ────────────────────────────────────────────────────────────

  INSERT INTO public.sessions (id, user_id, start_time, end_time, status, summary, categories, activities, matter_id) VALUES
  ('s-0327-1', uid, '2026-03-27T16:00:00Z', '2026-03-27T17:30:00Z', 'completed',
   'Finalized motion to modify child support in Patel matter. Completed reply brief rebutting imputed income arguments and attached updated DissoMaster calculation and job search documentation.',
   '[{"name": "Case Review", "minutes": 35, "percentage": 39}, {"name": "Legal Research", "minutes": 30, "percentage": 33}, {"name": "Document Drafting", "minutes": 25, "percentage": 28}]'::jsonb,
   '[]'::jsonb, 'mt-pate-1'),

  ('s-0327-2', uid, '2026-03-27T17:45:00Z', '2026-03-27T18:30:00Z', 'completed',
   'Client meeting with Roberto Martinez via Zoom to discuss settlement counter-proposal response. Emailed revised settlement terms to opposing counsel with 10-day response deadline.',
   '[{"name": "Client Communication", "minutes": 30, "percentage": 67}, {"name": "Document Drafting", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-mart-1'),

  ('s-0327-3', uid, '2026-03-27T20:00:00Z', '2026-03-27T20:45:00Z', 'completed',
   'Drafted declaration opposing relocation in Thompson matter. Reviewed opposing party''s reply brief and identified factual inaccuracies for rebuttal.',
   '[{"name": "Document Drafting", "minutes": 30, "percentage": 67}, {"name": "Case Review", "minutes": 15, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'mt-thom-2'),

  ('s-0327-4', uid, '2026-03-27T21:00:00Z', '2026-03-27T22:00:00Z', 'completed',
   'Final preparation for Davis DVRO hearing scheduled April 2. Rehearsed client testimony via Zoom and organized witness list. Finalized subpoenas for two additional witnesses.',
   '[{"name": "Court & Hearings", "minutes": 35, "percentage": 58}, {"name": "Case Review", "minutes": 25, "percentage": 42}]'::jsonb,
   '[]'::jsonb, 'mt-davi-1'),

  ('s-0327-5', uid, '2026-03-27T22:15:00Z', '2026-03-27T22:45:00Z', 'completed',
   'Pro bono consultation for unrepresented litigant seeking guidance on custody mediation preparation. Provided overview of court-ordered mediation process and documentation recommendations.',
   '[{"name": "Client Communication", "minutes": 20, "percentage": 67}, {"name": "Administrative", "minutes": 10, "percentage": 33}]'::jsonb,
   '[]'::jsonb, 'nb-probono');

  -- March 27 Activities
  INSERT INTO public.activities (id, user_id, session_id, matter_id, app, context, minutes, narrative, category, billable, effective_rate, activity_code, sort_order, start_time, end_time, approval_status) VALUES
  ('a-0327-1a', uid, 's-0327-1', 'mt-pate-1', 'Microsoft Excel', 'Patel_Income_Comparison_2024_2026.xlsx', 35,
   'Analyzed three-year income comparison for Amit Patel documenting decline from $285K (Meta W-2) to $120K (consulting); prepared exhibit showing job search timeline with 47 applications submitted and market analysis of senior engineering positions',
   'Case Review', TRUE, 350, 'A104', 0, '2026-03-27T16:00:00Z', '2026-03-27T16:35:00Z', 'pending'),
  ('a-0327-1b', uid, 's-0327-1', 'mt-pate-1', 'Westlaw', 'Search: earning capacity imputation tech layoffs 2025-2026', 30,
   'Researched earning capacity imputation standards in context of involuntary tech sector layoffs; identified In re Marriage of Simpson (2025) where court declined to impute income at prior level for involuntarily terminated engineer based on market evidence',
   'Legal Research', TRUE, 350, 'L110', 1, '2026-03-27T16:35:00Z', '2026-03-27T17:05:00Z', 'pending'),
  ('a-0327-1c', uid, 's-0327-1', 'mt-pate-1', 'Microsoft Word', 'Patel Reply Brief - Imputed Income.docx', 25,
   'Finalized reply brief rebutting opposing counsel''s imputed income arguments; demonstrated that current consulting income reflects good-faith earning capacity in depressed market; attached job search documentation and tech industry salary survey data',
   'Document Drafting', TRUE, 350, 'A103', 2, '2026-03-27T17:05:00Z', '2026-03-27T17:30:00Z', 'pending'),

  ('a-0327-2a', uid, 's-0327-2', 'mt-mart-1', 'Zoom', 'Client meeting - Roberto Martinez settlement', 30,
   'Discussed opposing counsel''s informal response to settlement counter-proposal; client authorized revised offer with adjusted spousal support step-down schedule and modified RSU division timeline; reviewed litigation cost projections if matter proceeds to trial',
   'Client Communication', TRUE, 450, 'A102', 0, '2026-03-27T17:45:00Z', '2026-03-27T18:15:00Z', 'pending'),
  ('a-0327-2b', uid, 's-0327-2', 'mt-mart-1', 'Microsoft Outlook', 'Email to Whitfield - revised settlement terms', 15,
   'Emailed revised settlement proposal to opposing counsel James Whitfield with 10-day response deadline; outlined modified terms including adjusted spousal support duration and RSU vesting schedule accommodation',
   'Document Drafting', TRUE, 450, 'A102', 1, '2026-03-27T18:15:00Z', '2026-03-27T18:30:00Z', 'pending'),

  ('a-0327-3a', uid, 's-0327-3', 'mt-thom-2', 'Microsoft Word', 'Thompson Sur-Reply Declaration.docx', 30,
   'Drafted sur-reply declaration addressing factual inaccuracies in opposing party''s reply brief regarding children''s alleged preference for relocation; included authenticated school counselor statement contradicting father''s claims',
   'Document Drafting', TRUE, 375, 'A103', 0, '2026-03-27T20:00:00Z', '2026-03-27T20:30:00Z', 'pending'),
  ('a-0327-3b', uid, 's-0327-3', 'mt-thom-2', 'Adobe Acrobat', 'Thompson_Reply_Brief_Chow.pdf', 15,
   'Reviewed opposing counsel Linda Chow''s reply brief; identified three material misrepresentations regarding children''s adjustment and documented factual basis for rebuttal',
   'Case Review', TRUE, 375, 'A104', 1, '2026-03-27T20:30:00Z', '2026-03-27T20:45:00Z', 'pending'),

  ('a-0327-4a', uid, 's-0327-4', 'mt-davi-1', 'Zoom', 'Hearing prep - Rachel Davis testimony rehearsal', 35,
   'Conducted final testimony preparation session with Rachel Davis for April 2 DVRO hearing; rehearsed direct examination testimony covering chronology of abuse, impact on children, and safety concerns; practiced responses to anticipated cross-examination',
   'Court & Hearings', TRUE, 375, 'A101', 0, '2026-03-27T21:00:00Z', '2026-03-27T21:35:00Z', 'pending'),
  ('a-0327-4b', uid, 's-0327-4', 'mt-davi-1', 'Adobe Acrobat', 'Davis_Witness_List_Subpoenas.pdf', 25,
   'Finalized witness list and served subpoenas for Officer Reyes (SJPD) and DV advocate Maria Santos; organized witness testimony outlines and coordinated hearing day logistics with courthouse',
   'Case Review', TRUE, 375, 'L140', 1, '2026-03-27T21:35:00Z', '2026-03-27T22:00:00Z', 'pending'),

  ('a-0327-5a', uid, 's-0327-5', 'nb-probono', 'Zoom', 'Pro bono - custody mediation prep consultation', 20,
   'Pro bono consultation with unrepresented litigant preparing for court-ordered custody mediation; explained mediation process, documentation to bring, and strategies for presenting parenting plan proposals effectively',
   'Client Communication', FALSE, NULL, 'A102', 0, '2026-03-27T22:15:00Z', '2026-03-27T22:35:00Z', 'pending'),
  ('a-0327-5b', uid, 's-0327-5', 'nb-probono', 'Microsoft Word', 'Pro Bono Mediation Prep Checklist.docx', 10,
   'Prepared mediation preparation checklist and resource list for pro bono client including documentation recommendations and local self-help center contact information',
   'Administrative', FALSE, NULL, 'A106', 1, '2026-03-27T22:35:00Z', '2026-03-27T22:45:00Z', 'pending');

  RAISE NOTICE 'Demo data seeded successfully for user %', uid;
END;
$$;
