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
      const latest = persistence.initial.sessions[0]
      return isValidPracticeConfiguration(latest) ? latest : null
    })
  const [session, setSession] = useState<PracticeSessionState | null>(null)
  const sessionRef = useRef<PracticeSessionState | null>(null)

  useEffect(() => {
    persistence.save(progress)
  }, [persistence, progress])

  function commitProgress(next: typeof progress) {
    progressRef.current = next
    setProgress(next)
  }

  function updateSettings(candidate: unknown) {
    if (!isAppSettings(candidate)) return false
    commitProgress({
      ...progressRef.current,
      settings: structuredClone(candidate),
    })
    return true
  }

  function patchSettings(changes: Partial<AppSettings>) {
    return updateSettings({ ...progressRef.current.settings, ...changes })
  }

  function clearAllData() {
    sessionRef.current = null
    setSession(null)
    setConfiguration(null)
    commitProgress(createDefaultProgress())
    return persistence.clearAll()
  }

  function resetStatistics() {
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
    return persistence.save(cleared)
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
    const next = createPracticeSession(snapshot, {
      mistakePatterns: progressRef.current.mistakePatterns,
      masteryThreshold: progressRef.current.settings.masteryThreshold,
    })
    commitProgress(withSessionProgress(progressRef.current, next))
    sessionRef.current = next
    setSession(next)
    setConfiguration(snapshot)
    return true
  }

  function dispatchSession(action: PracticeSessionAction) {
    const current = sessionRef.current
    if (!current) return false
    const next = transitionPracticeSession(current, action, {
      mistakePatterns: progressRef.current.mistakePatterns,
      masteryThreshold: progressRef.current.settings.masteryThreshold,
    })
    if (next === current) return false
    // Commit synchronously before React renders: stale callbacks in the same
    // batch must see the new question/session, not an already recorded attempt.
    sessionRef.current = next
    setSession(next)
    if (action.type === 'report' || action.type === 'end')
      commitProgress(withSessionProgress(progressRef.current, next))
    if (action.type === 'report' && progressRef.current.settings.soundEnabled)
      void playPracticeSound()
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
