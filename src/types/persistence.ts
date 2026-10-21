import type { MistakePattern } from './mistake'
import type {
  PracticeAttempt,
  PracticeSession,
  PracticeSessionState,
} from './session'
import type { AppSettings } from './settings'
import type { AppStatistics } from './statistics'

export interface StoredProgress {
  settings: AppSettings
  sessions: PracticeSession[]
  attempts: PracticeAttempt[]
  mistakePatterns: MistakePattern[]
  statistics: AppStatistics
}

/** Atomic recovery checkpoint; null session is a pending completion/reset save. */
export interface SessionRecoverySnapshot {
  version: 1
  session: PracticeSessionState | null
  progress: StoredProgress
}
