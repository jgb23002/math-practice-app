import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react'
import {
  createProgressPersistence,
  createDefaultProgress,
  withSessionProgress,
} from '../services/progressPersistence'
import { createJsonStorage, type JsonStorage } from '../services/storage'
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
import { isAppSettings } from '../utils/storageValidation'
import { createEmptyStatistics } from '../utils/statistics'
import type { AppSettings } from '../types/settings'
import { playPracticeSound } from '../services/practiceSound'
import { getReviewPatterns } from '../services/mistakeReview'
import PracticeSessionContext from './PracticeSessionContext'
import { reportDevelopmentError } from '../utils/developmentErrors'

function AppProvider({
  children,
  storage: suppliedStorage,
}: PropsWithChildren<{ storage?: JsonStorage }>) {
  const [storage] = useState(() => suppliedStorage ?? createJsonStorage())
  const [persistence] = useState(() => createProgressPersistence(storage))
  const [progress, setProgress] = useState(persistence.initial)
  const progressRef = useRef(progress)
  const storageWarning = useSyncExternalStore(
    persistence.subscribe,
    persistence.getWarning,
    persistence.getWarning,
  )
  const [configuration, setConfiguration] =
    useState<PracticeConfiguration | null>(() => {
      const latest =
        persistence.recoveredSession ?? persistence.initial.sessions[0]
      return isValidPracticeConfiguration(latest) ? latest : null
    })
  const [session, setSession] = useState<PracticeSessionState | null>(
    persistence.recoveredSession,
  )
  const sessionRef = useRef<PracticeSessionState | null>(
    persistence.recoveredSession,
  )
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    persistence.saveSession(progress, session)
  }, [persistence, progress, session])

  function commitProgress(next: typeof progress) {
    progressRef.current = next
    setProgress(next)
    persistence.saveSession(next, sessionRef.current)
  }

  function updateSettings(candidate: unknown) {
    if (!isAppSettings(candidate)) return false
    try {
      commitProgress({
        ...progressRef.current,
        settings: structuredClone(candidate),
      })
      setActionError(null)
      return true
    } catch (error) {
      reportDevelopmentError('Settings could not be updated', error)
      setActionError(
        'Those settings couldn’t be changed yet. Please try again.',
      )
      return false
    }
  }

  function patchSettings(changes: Partial<AppSettings>) {
    return updateSettings({ ...progressRef.current.settings, ...changes })
  }

  function clearAllData() {
    setActionError(null)
    sessionRef.current = null
    setSession(null)
    setConfiguration(null)
    const cleared = createDefaultProgress()
    progressRef.current = cleared
    setProgress(cleared)
    return persistence.clearAll()
  }

  function resetStatistics() {
    setActionError(null)
    // Invalidate the old card before React renders; stale reports cannot bring
    // back cleared attempts. Practice preferences remain available in setup.
    sessionRef.current = null
    setSession(null)
    const cleared = {
      ...progressRef.current,
      sessions: [],
      attempts: [],
      statistics: createEmptyStatistics(),
    }
    commitProgress(cleared)
    return persistence.saveSession(cleared, null)
  }

  function configureSession(candidate: unknown) {
    if (!isValidPracticeConfiguration(candidate)) return false

    const snapshot: PracticeConfiguration = {
      ...(candidate.mode ? { mode: candidate.mode } : {}),
      operations: [...candidate.operations],
      difficulty: candidate.difficulty,
      sessionLength: candidate.sessionLength,
    }
    if (
      snapshot.mode === 'mistake-review' &&
      getReviewPatterns(progressRef.current.mistakePatterns, snapshot)
        .length === 0
    )
      return false
    try {
      const next = createPracticeSession(snapshot, {
        mistakePatterns: progressRef.current.mistakePatterns,
        masteryThreshold: progressRef.current.settings.masteryThreshold,
      })
      const nextProgress = withSessionProgress(progressRef.current, next)
      sessionRef.current = next
      setSession(next)
      commitProgress(nextProgress)
      setConfiguration(snapshot)
      setActionError(null)
      return true
    } catch (error) {
      reportDevelopmentError('Practice could not start', error)
      setActionError(
        'Your practice couldn’t start yet. Please try Start Session again.',
      )
      return false
    }
  }

  function dispatchSession(action: PracticeSessionAction) {
    const current = sessionRef.current
    if (!current) return false
    if (
      action.type === 'report' &&
      progressRef.current.attempts.some(
        (a) =>
          a.sessionId === action.sessionId &&
          a.questionId === action.result?.questionId,
      )
    )
      return false
    try {
      const next = transitionPracticeSession(current, action, {
        mistakePatterns: progressRef.current.mistakePatterns,
        masteryThreshold: progressRef.current.settings.masteryThreshold,
      })
      if (next === current) return false
      // Prepare all fallible work before replacing either live snapshot.
      const nextProgress = withSessionProgress(progressRef.current, next)
      // Commit synchronously before React renders: stale callbacks in the same
      // batch must see the new question/session, not an already recorded attempt.
      sessionRef.current = next
      setSession(next)
      commitProgress(nextProgress)
      setActionError(null)
      if (action.type === 'report' && progressRef.current.settings.soundEnabled)
        void playPracticeSound()
      return true
    } catch (error) {
      reportDevelopmentError('Practice action could not finish', error)
      setActionError(
        'We couldn’t finish that step yet. Please try again. Your earlier marks are safe.',
      )
      return false
    }
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
      ...(current.mode ? { mode: current.mode } : {}),
      operations: [...current.operations],
      difficulty: current.difficulty,
      sessionLength: current.sessionLength,
    })
  }

  return (
    <PracticeSessionContext.Provider
      value={{
        progress,
        updateSettings,
        patchSettings,
        clearAllData,
        resetStatistics,
        storageWarning,
        actionError,
        configuration,
        configureSession,
        session,
        dispatchSession,
        restartSession,
        getActiveSession: () =>
          sessionRef.current?.isActive ? sessionRef.current : null,
        saveCurrentSession: () =>
          persistence.saveSession(progressRef.current, sessionRef.current),
      }}
    >
      {children}
    </PracticeSessionContext.Provider>
  )
}

export default AppProvider
