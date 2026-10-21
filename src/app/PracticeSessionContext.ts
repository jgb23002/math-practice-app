import { createContext } from 'react'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import type { StoredProgress } from '../types/persistence'
import type { AppSettings } from '../types/settings'
import type {
  PracticeSessionAction,
  PracticeSessionState,
} from '../types/session'

interface PracticeSessionContextValue {
  progress: StoredProgress
  updateSettings: (candidate: unknown) => boolean
  patchSettings: (changes: Partial<AppSettings>) => boolean
  /** Resets memory; returns whether every application storage key was erased. */
  clearAllData: () => boolean
  /** Clears history in memory; returns whether the cleared snapshot was saved. */
  resetStatistics: () => boolean
  storageWarning: string | null
  configuration: PracticeConfiguration | null
  configureSession: (candidate: unknown) => boolean
  session: PracticeSessionState | null
  dispatchSession: (action: PracticeSessionAction) => boolean
  restartSession: (completedSessionId: string) => boolean
}

const PracticeSessionContext = createContext<
  PracticeSessionContextValue | undefined
>(undefined)

export default PracticeSessionContext
