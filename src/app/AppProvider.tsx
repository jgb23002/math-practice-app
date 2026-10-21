import { useRef, useState, type PropsWithChildren } from 'react'
import {
  createPracticeSession,
  transitionPracticeSession,
} from '../services/practiceSession'
import type {
  PracticeSessionAction,
  PracticeSessionState,
} from '../types/session'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import { isValidPracticeConfiguration } from '../utils/practiceConfiguration'
import PracticeSessionContext from './PracticeSessionContext'

function AppProvider({ children }: PropsWithChildren) {
  const [configuration, setConfiguration] =
    useState<PracticeConfiguration | null>(null)
  const [session, setSession] = useState<PracticeSessionState | null>(null)
  const sessionRef = useRef<PracticeSessionState | null>(null)

  function configureSession(candidate: unknown) {
    if (!isValidPracticeConfiguration(candidate)) return false

    const snapshot: PracticeConfiguration = {
      operations: [...candidate.operations],
      difficulty: candidate.difficulty,
      sessionLength: candidate.sessionLength,
    }
    const next = createPracticeSession(snapshot)
    sessionRef.current = next
    setSession(next)
    setConfiguration(snapshot)
    return true
  }

  function dispatchSession(action: PracticeSessionAction) {
    const current = sessionRef.current
    if (!current) return false
    const next = transitionPracticeSession(current, action)
    if (next === current) return false
    // Commit synchronously before React renders: stale callbacks in the same
    // batch must see the new question/session, not an already recorded attempt.
    sessionRef.current = next
    setSession(next)
    return true
  }

  function restartSession(completedSessionId: string) {
    const current = sessionRef.current
    if (
      !current ||
      current.id !== completedSessionId ||
      current.isActive ||
      !current.completedAt
    )
      return false
    // The first call synchronously replaces the completed snapshot; a second
    // click carrying its old ID cannot create another session.
    return configureSession({
      operations: [...current.operations],
      difficulty: current.difficulty,
      sessionLength: current.sessionLength,
    })
  }

  return (
    <PracticeSessionContext.Provider
      value={{
        configuration,
        configureSession,
        session,
        dispatchSession,
        restartSession,
      }}
    >
      {children}
    </PracticeSessionContext.Provider>
  )
}

export default AppProvider
