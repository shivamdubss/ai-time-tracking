import { describe, it, expect } from 'vitest'
import { CATEGORY_COLORS, CATEGORY_BAR_COLORS, getCategoryColors, getCategoryBarColor } from './types'

describe('Legal category types', () => {
  const legalCategories = [
    'Legal Research',
    'Document Drafting',
    'Client Communication',
    'Court & Hearings',
    'Case Review',
    'Administrative',
  ]

  it('has color definitions for all legal categories', () => {
    for (const cat of legalCategories) {
      expect(CATEGORY_COLORS[cat]).toBeDefined()
      expect(CATEGORY_COLORS[cat].text).toBeTruthy()
      expect(CATEGORY_COLORS[cat].bg).toBeTruthy()
      expect(CATEGORY_BAR_COLORS[cat]).toBeTruthy()
    }
  })

  it('has legacy color definitions for backward compat', () => {
    const legacyCategories = ['Coding', 'Communication', 'Research', 'Meetings', 'Browsing']
    for (const cat of legacyCategories) {
      expect(CATEGORY_COLORS[cat]).toBeDefined()
      expect(CATEGORY_BAR_COLORS[cat]).toBeTruthy()
    }
  })

  it('getCategoryColors returns fallback for unknown categories', () => {
    const colors = getCategoryColors('SomeUnknownCategory')
    expect(colors.text).toBe('#737373')
    expect(colors.bg).toBe('#F5F5F5')
  })

  it('getCategoryBarColor returns fallback for unknown categories', () => {
    expect(getCategoryBarColor('SomeUnknownCategory')).toBe('#737373')
  })

  it('getCategoryColors returns correct colors for known categories', () => {
    const colors = getCategoryColors('Legal Research')
    expect(colors.text).toContain('research')
  })
})
