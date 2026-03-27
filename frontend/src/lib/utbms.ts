import type { CategoryName } from './types'

/**
 * UTBMS (Uniform Task-Based Management System) Litigation Code Set.
 * Standard billing codes used by law firms for activity classification.
 */
export const UTBMS_CODES: Record<string, string> = {
  // L100 — Case Assessment
  L100: 'Case Assessment, Development and Administration',
  L110: 'Fact Investigation/Development',
  L120: 'Analysis/Strategy',
  L130: 'Experts/Consultants',
  L140: 'Document/File Management',
  L150: 'Budgeting',
  L160: 'Settlement/Non-Binding ADR',
  L190: 'Other Case Assessment',
  // L200 — Pre-Trial Pleadings and Motions
  L200: 'Pre-Trial Pleadings and Motions',
  L210: 'Pleadings',
  L220: 'Preliminary Injunctions/Provisional Remedies',
  L230: 'Court Mandated Conferences',
  L240: 'Dispositive Motions',
  L250: 'Other Written Motions and Submissions',
  // L300 — Discovery
  L300: 'Discovery',
  L310: 'Written Discovery',
  L320: 'Document Production',
  L330: 'Depositions',
  L340: 'Expert Discovery',
  // L400 — Trial
  L400: 'Trial Preparation and Trial',
  L410: 'Fact Witnesses',
  L420: 'Expert Witnesses',
  L430: 'Written Motions and Submissions',
  L440: 'Hearing/Trial Attendance',
  // L500 — Appeal
  L500: 'Appeal',
  L510: 'Appellate Briefs and Written Motions',
  L520: 'Appellate Court Attendance',
  // Activity codes (A-series)
  A101: 'Plan and Prepare for, and Attend, Meeting',
  A102: 'Communicate (Telephone, Email, Letters)',
  A103: 'Draft/Revise',
  A104: 'Review/Analyze',
  A106: 'File/Serve',
}

export function getCodeLabel(code: string): string {
  return UTBMS_CODES[code] || code
}

export const UTBMS_CODE_LIST = Object.entries(UTBMS_CODES).map(([code, label]) => ({
  code,
  label: `${code}: ${label}`,
}))

/** Derive a legal category from a UTBMS code for color bars and analytics. */
export function utbmsToCategory(code: string | null | undefined): CategoryName {
  if (!code) return 'Administrative'
  const prefix = code.charAt(0)
  const num = parseInt(code.slice(1), 10)

  if (prefix === 'L') {
    if (num >= 100 && num <= 190) return 'Case Review'
    if (num >= 200 && num <= 250) return 'Document Drafting'
    if (num >= 300 && num <= 340) return 'Case Review'
    if (num >= 400 && num <= 440) return 'Court & Hearings'
    if (num >= 500 && num <= 520) return 'Court & Hearings'
  }

  if (prefix === 'A') {
    if (code === 'A101') return 'Court & Hearings'
    if (code === 'A102') return 'Client Communication'
    if (code === 'A103') return 'Document Drafting'
    if (code === 'A104') return 'Legal Research'
    if (code === 'A106') return 'Administrative'
  }

  return 'Administrative'
}
