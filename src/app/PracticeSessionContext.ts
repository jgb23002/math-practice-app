import { createContext } from 'react'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import type {
  PracticeSessionAction,
  PracticeSessionState,
} from '../types/session'

interface PracticeSessionContextValue {
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
