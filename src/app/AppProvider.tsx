import {
  useEffect,
  useCallback,
  useMemo,
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
import { ApplicationStatusContext } from './ApplicationStatusContext'
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

  const commitProgress = useCallback(
    (next: typeof progress) => {
      if (next !== progressRef.current) {
        progressRef.current = next
        setProgress(next)
      }
      // One synchronous save per accepted action also protects immediate refresh.
      return persistence.saveSession(next, sessionRef.current)
    },
    [persistence],
  )

  const updateSettings = useCallback(
    (candidate: unknown) => {
      if (!isAppSettings(candidate)) return false
      const current = progressRef.current.settings
      if (
        (
          [
            'soundEnabled',
            'animationsEnabled',
            'showExplanations',
            'feedbackEnabled',
            'defaultSessionLength',
            'defaultDifficulty',
            'masteryThreshold',
          ] as const
        ).every((key) => current[key] === candidate[key]) &&
        current.defaultOperations.join(',') ===
          candidate.defaultOperations.join(',')
      ) {
        setActionError(null)
        return true
      }
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
    },
    [commitProgress],
  )

  const patchSettings = useCallback(
    (changes: Partial<AppSettings>) => {
      return updateSettings({ ...progressRef.current.settings, ...changes })
    },
    [updateSettings],
  )

  const clearAllData = useCallback(() => {
    setActionError(null)
    sessionRef.current = null
    setSession(null)
    setConfiguration(null)
    const cleared = createDefaultProgress()
    progressRef.current = cleared
    setProgress(cleared)
    const clearedSuccessfully = persistence.clearAll()
    if (clearedSuccessfully) persistence.saveSession(cleared, null)
    return clearedSuccessfully
  }, [persistence])

  const resetStatistics = useCallback(() => {
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
    return commitProgress(cleared)
  }, [commitProgress])

  const configureSession = useCallback(
    (candidate: unknown) => {
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
    },
    [commitProgress],
  )

  const dispatchSession = useCallback(
    (action: PracticeSessionAction) => {
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
        const nextProgress =
          next.attempts !== current.attempts ||
          next.isActive !== current.isActive
            ? withSessionProgress(progressRef.current, next)
            : progressRef.current
        // Commit synchronously before React renders: stale callbacks in the same
        // batch must see the new question/session, not an already recorded attempt.
        sessionRef.current = next
        setSession(next)
        commitProgress(nextProgress)
        setActionError(null)
        if (
          action.type === 'report' &&
          progressRef.current.settings.soundEnabled
        )
          void playPracticeSound()
        return true
      } catch (error) {
        reportDevelopmentError('Practice action could not finish', error)
        setActionError(
          'We couldn’t finish that step yet. Please try again. Your earlier marks are safe.',
        )
        return false
      }
    },
    [commitProgress],
  )

  useEffect(() => {
    const current = sessionRef.current
    if (
      persistence.needsQuestionGeneration &&
      current?.isActive &&
      !current.currentQuestion
    ) {
      dispatchSession({ type: 'retry', sessionId: current.id })
    } else persistence.saveSession(progressRef.current, current)
  }, [persistence, dispatchSession])

  const restartSession = useCallback(
    (completedSessionId: string) => {
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
    },
    [configureSession],
  )

  const getActiveSession = useCallback(
    () => (sessionRef.current?.isActive ? sessionRef.current : null),
    [],
  )
  const saveCurrentSession = useCallback(
    () => persistence.saveSession(progressRef.current, sessionRef.current),
    [persistence],
  )
  const value = useMemo(
    () => ({
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
      getActiveSession,
      saveCurrentSession,
    }),
    [
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
      getActiveSession,
      saveCurrentSession,
    ],
  )
  const status = useMemo(
    () => ({ storageWarning, actionError }),
    [storageWarning, actionError],
  )

  return (
    <PracticeSessionContext.Provider value={value}>
      <ApplicationStatusContext.Provider value={status}>
        {children}
      </ApplicationStatusContext.Provider>
    </PracticeSessionContext.Provider>
  )
}

export default AppProvider
