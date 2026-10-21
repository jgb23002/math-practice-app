import type { PracticeAttempt, PracticeSession } from './session'
import type { AppSettings } from './settings'
import type { AppStatistics } from './statistics'

export interface StoredProgress {
  settings: AppSettings
  sessions: PracticeSession[]
  attempts: PracticeAttempt[]
  statistics: AppStatistics
}
