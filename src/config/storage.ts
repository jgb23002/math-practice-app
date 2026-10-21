import type { AppSettings } from '../types/settings'

export const STORAGE_VERSION = 1
export const MAX_RECENT_SESSIONS = 100
export const STORAGE_KEYS = {
  settings: 'mathPractice.settings',
  sessions: 'mathPractice.sessions',
  attempts: 'mathPractice.attempts',
  mistakePatterns: 'mathPractice.mistakePatterns',
  statistics: 'mathPractice.statistics',
  version: 'mathPractice.version',
} as const

export function createDefaultSettings(): AppSettings {
  return {
    soundEnabled: false,
    animationsEnabled: true,
    showExplanations: true,
    defaultSessionLength: 10,
    defaultDifficulty: 1,
    defaultOperations: [],
    masteryThreshold: 3,
  }
}
