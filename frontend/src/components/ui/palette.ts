import type { ApplicationStatus } from '../../types/application'

/**
 * Single source of truth for product color choices.
 *
 * Change values here to reskin the application. Components should reference
 * semantic Chakra tokens such as `brand.solid`, `bg.panel`, and `fg.muted`
 * instead of importing these raw values.
 */
export const palette = {
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  light: {
    background: '#f8fafc',
    backgroundSubtle: '#f1f5f9',
    backgroundMuted: '#e2e8f0',
    backgroundEmphasized: '#cbd5e1',
    panel: '#ffffff',
    elevated: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    textSubtle: '#64748b',
    border: '#e2e8f0',
    borderMuted: '#f1f5f9',
    borderEmphasized: '#cbd5e1',
  },
  dark: {
    background: '#0f172a',
    backgroundSubtle: '#020617',
    backgroundMuted: '#111c31',
    backgroundEmphasized: '#26344d',
    panel: '#111827',
    elevated: '#172033',
    text: '#f8fafc',
    textMuted: '#cbd5e1',
    textSubtle: '#94a3b8',
    border: '#334155',
    borderMuted: '#1e293b',
    borderEmphasized: '#475569',
  },
  alpha: {
    brandSubtleDark: 'rgba(99, 102, 241, 0.16)',
    brandMutedDark: 'rgba(99, 102, 241, 0.24)',
    brandEmphasizedDark: 'rgba(129, 140, 248, 0.34)',
    cardShadow: 'rgba(15, 23, 42, 0.06)',
  },
} as const

export const applicationStatusPalettes: Record<ApplicationStatus, string> = {
  SAVED: 'gray',
  APPLIED: 'blue',
  SCREENING: 'cyan',
  ASSESSMENT: 'purple',
  INTERVIEW: 'orange',
  OFFER: 'green',
  REJECTED: 'red',
  WITHDRAWN: 'gray',
}
