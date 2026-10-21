import {
  createDefaultSettings,
  MAX_RECENT_SESSIONS,
  STORAGE_KEYS,
  STORAGE_VERSION,
} from '../config/storage'
import type { StoredProgress } from '../types/persistence'
import type { PracticeSessionState } from '../types/session'
import {
  addAttemptsToStatistics,
  calculateStatistics,
  createEmptyStatistics,
} from '../utils/statistics'
import {
  isAppSettings,
  isAppStatistics,
  isAttemptHistory,
  isMistakePatternHistory,
  isSessionHistory,
} from '../utils/storageValidation'
import { recordMistakes, recoverMistakePatterns } from './mistakeTracking'
import type { JsonStorage } from './storage'
import { isSessionRecoverySnapshot } from '../utils/sessionRecoveryValidation'
import { resolveSessionRecovery } from './sessionRecovery'
import type { SessionRecoverySnapshot } from '../types/persistence'
import { recoverAttempts, recoverSessions } from './historyRecovery'
import { reportDevelopmentError } from '../utils/developmentErrors'

export { createEmptyStatistics } from '../utils/statistics'

export const SAVE_WARNING =
  'We can’t save your progress on this device right now. You can keep practicing, but new progress may be lost when you close this page.'
const RECOVERY_WARNING =
  'Some saved progress couldn’t be read. We’ve kept the parts we could, and you can keep practicing.'
const VERSION_WARNING =
  'This saved progress uses a version we can’t update. You can keep practicing, but new progress won’t be saved.'
export const CLEAR_DATA_WARNING =
  'Some saved data couldn’t be erased on this device. Practice is reset for now, but saved data may return after a reload. Try Clear All Application Data again.'

export function createDefaultProgress(): StoredProgress {
  return {
    settings: createDefaultSettings(),
    sessions: [],
    attempts: [],
    mistakePatterns: [],
    statistics: createEmptyStatistics(),
  }
}

/** Explicitly authorized deletion, including unreadable data and version metadata. */
export function clearStoredProgress(storage: JsonStorage): boolean {
  return Object.values(STORAGE_KEYS)
    .map((key) => storage.remove(key).ok)
    .every(Boolean)
}

function isVersion(value: unknown): value is { version: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    Number.isSafeInteger(value.version) &&
    (value.version as number) >= 0
  )
}

// Version 0 is the unversioned format using the same category shapes. Future
// migrations belong here, one version at a time, after category validation.
const migrations: Record<number, (data: StoredProgress) => StoredProgress> = {
  0: (data) => data,
}

export function loadStoredProgress(storage: JsonStorage) {
  const version = storage.read(STORAGE_KEYS.version, isVersion)
  const settings = storage.read(STORAGE_KEYS.settings, isAppSettings)
  const isList = (value: unknown): value is unknown[] => Array.isArray(value)
  const sessions = storage.read(STORAGE_KEYS.sessions, isList)
  const attempts = storage.read(STORAGE_KEYS.attempts, isList)
  const statistics = storage.read(STORAGE_KEYS.statistics, isAppStatistics)
  const mistakes = storage.read(
    STORAGE_KEYS.mistakePatterns,
    (value): value is unknown[] => Array.isArray(value),
  )
  const recoveredMistakes = recoverMistakePatterns(
    mistakes.status === 'valid' ? mistakes.value : [],
  )
  const recoveredSessions = recoverSessions(
    sessions.status === 'valid' ? sessions.value : [],
  )
  const recoveredAttempts = recoverAttempts(
    attempts.status === 'valid' ? attempts.value : [],
  )
  const results = [settings, sessions, attempts, statistics, mistakes]
  const unavailable =
    version.status === 'unavailable' ||
    results.some((result) => result.status === 'unavailable')
  const versionNumber = version.status === 'valid' ? version.value.version : 0
  const writable =
    (version.status === 'valid' || version.status === 'missing') &&
    versionNumber <= STORAGE_VERSION &&
    !unavailable
  let progress: StoredProgress = {
    settings:
      settings.status === 'valid' ? settings.value : createDefaultSettings(),
    sessions:
      sessions.status === 'valid'
        ? [...recoveredSessions.records]
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, MAX_RECENT_SESSIONS)
        : [],
    attempts: recoveredAttempts.records,
    mistakePatterns: recoveredMistakes.patterns,
    statistics:
      statistics.status === 'valid'
        ? statistics.value
        : createEmptyStatistics(),
  }
  // Repair a missing/corrupt or lagging cache from readable attempts. A larger
  // valid aggregate may include history whose detail category was lost; retain
  // it rather than erasing unaffected totals after that category recovers.
  const calculated = calculateStatistics(progress.attempts)
  const cached = progress.statistics
  const groups = [
    [cached, calculated],
    ...(['addition', 'subtraction', 'multiplication', 'division'] as const).map(
      (operation) => [
        cached.byOperation[operation],
        calculated.byOperation[operation],
      ],
    ),
    ...([1, 2, 3, 4] as const).map((level) => [
      cached.byDifficulty[level],
      calculated.byDifficulty[level],
    ]),
  ]
  const laggingStatistics = groups.some(([stored, minimum]) =>
    (['attempted', 'correct', 'incorrect'] as const).some(
      (field) => stored[field] < minimum[field],
    ),
  )
  if (laggingStatistics) progress.statistics = calculated
  if (writable)
    for (let from = versionNumber; from < STORAGE_VERSION; from++)
      progress = migrations[from](progress)
  const warning = unavailable
    ? SAVE_WARNING
    : !writable
      ? VERSION_WARNING
      : recoveredMistakes.recovered ||
          recoveredSessions.recovered ||
          recoveredAttempts.recovered ||
          laggingStatistics ||
          results.some((result) => result.status === 'invalid')
        ? RECOVERY_WARNING
        : null
  if (warning)
    reportDevelopmentError('Stored progress recovery', {
      version: version.status,
      categories: results.map((result) => result.status),
      recoveredSessions: recoveredSessions.recovered,
      recoveredAttempts: recoveredAttempts.recovered,
      recoveredMistakes: recoveredMistakes.recovered,
      laggingStatistics,
    })
  return { progress, writable, warning }
}

export function saveStoredProgress(
  storage: JsonStorage,
  progress: StoredProgress,
) {
  return writeProgress(storage, progress, false)
}

function writeProgress(
  storage: JsonStorage,
  progress: StoredProgress,
  validated: boolean,
) {
  const version = storage.read(STORAGE_KEYS.version, isVersion)
  if (
    version.status !== 'missing' &&
    (version.status !== 'valid' || version.value.version > STORAGE_VERSION)
  )
    return false
  // Keep categories independent: one failed write must not prevent the others.
  const results = [
    (validated || isAppSettings(progress.settings)) &&
      storage.write(STORAGE_KEYS.settings, progress.settings).ok,
    (validated || isSessionHistory(progress.sessions)) &&
      storage.write(STORAGE_KEYS.sessions, progress.sessions).ok,
    (validated || isAttemptHistory(progress.attempts)) &&
      storage.write(STORAGE_KEYS.attempts, progress.attempts).ok,
    (validated || isMistakePatternHistory(progress.mistakePatterns)) &&
      storage.write(STORAGE_KEYS.mistakePatterns, progress.mistakePatterns).ok,
    (validated || isAppStatistics(progress.statistics)) &&
      storage.write(STORAGE_KEYS.statistics, progress.statistics).ok,
  ]
  if (!results.every(Boolean)) return false
  return storage.write(STORAGE_KEYS.version, { version: STORAGE_VERSION }).ok
}

/** Observable save status for React's external-store subscription. */
export function createProgressPersistence(storage: JsonStorage) {
  const loaded = loadStoredProgress(storage)
  const recovery = storage.read(
    STORAGE_KEYS.activeSession,
    isSessionRecoverySnapshot,
  )
  const restored =
    loaded.writable && recovery.status === 'valid'
      ? resolveSessionRecovery(recovery.value, loaded.progress)
      : { progress: loaded.progress, session: null }
  const initial = restored.session
    ? withSessionProgress(restored.progress, restored.session)
    : restored.progress
  let hasRecovery = recovery.status !== 'missing'
  let warning = !loaded.writable
    ? loaded.warning
    : recovery.status === 'invalid'
      ? 'Your saved practice card couldn’t be restored. Your other progress is still here.'
      : recovery.status === 'unavailable'
        ? SAVE_WARNING
        : loaded.warning
  let baselineWarning = warning
  let writable = loaded.writable
  const listeners = new Set<() => void>()
  function publish(next: string | null) {
    if (warning === next) return
    warning = next
    for (const listener of listeners) listener()
  }
  return {
    initial,
    recoveredSession: restored.session?.isActive ? restored.session : null,
    needsQuestionGeneration:
      'needsQuestionGeneration' in restored &&
      restored.needsQuestionGeneration === true,
    getWarning: () => warning,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    save: (progress: StoredProgress) => {
      if (!writable) return false
      const saved = saveStoredProgress(storage, progress)
      publish(saved ? baselineWarning : SAVE_WARNING)
      return saved
    },
    saveSession: (
      progress: StoredProgress,
      session: PracticeSessionState | null,
    ) => {
      if (!writable) return false
      let validated = false
      // Write the complete checkpoint before any independent categories. If a
      // later category write fails, recovery uses this consistent snapshot.
      if (session?.isActive || hasRecovery) {
        const snapshot: SessionRecoverySnapshot = {
          version: 1,
          progress,
          session: session?.isActive ? session : null,
        }
        if (
          !isSessionRecoverySnapshot(snapshot) ||
          !storage.write(STORAGE_KEYS.activeSession, snapshot).ok
        ) {
          publish(SAVE_WARNING)
          return false
        }
        hasRecovery = true
        validated = true
      }
      // A checkpoint already validates every progress category. Reuse that
      // result within this synchronous save, without caching mutable objects
      // across calls or weakening validation for independent category saves.
      const saved = writeProgress(storage, progress, validated)
      const cleared =
        !session?.isActive && hasRecovery && saved
          ? storage.remove(STORAGE_KEYS.activeSession).ok
          : true
      if (!session?.isActive && saved && cleared) hasRecovery = false
      publish(saved && cleared ? baselineWarning : SAVE_WARNING)
      return saved && cleared
    },
    clearAll: () => {
      // Block normal autosaves during a partial deletion so old snapshots cannot
      // refill cleared keys. Only a successful explicit retry enables writes.
      writable = false
      if (!clearStoredProgress(storage)) {
        publish(CLEAR_DATA_WARNING)
        return false
      }
      baselineWarning = null
      hasRecovery = false
      writable = true
      publish(null)
      return true
    },
  }
}

/** Upsert session metadata and append new attempts without recounting old ones. */
export function withSessionProgress(
  progress: StoredProgress,
  session: PracticeSessionState,
): StoredProgress {
  const knownIds = new Set(progress.attempts.map((attempt) => attempt.id))
  const knownQuestions = new Set(
    progress.attempts.map((a) => JSON.stringify([a.sessionId, a.questionId])),
  )
  const added = session.attempts.filter((attempt) => {
    const questionKey = JSON.stringify([attempt.sessionId, attempt.questionId])
    if (knownIds.has(attempt.id) || knownQuestions.has(questionKey))
      return false
    knownIds.add(attempt.id)
    knownQuestions.add(questionKey)
    return true
  })
  const metadata = {
    ...(session.mode ? { mode: session.mode } : {}),
    id: session.id,
    startedAt: session.startedAt,
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
    operations: [...session.operations],
    difficulty: session.difficulty,
    sessionLength: session.sessionLength,
    attempted: session.attempted,
    correct: session.correct,
    incorrect: session.incorrect,
  }
  return {
    ...progress,
    sessions: [
      metadata,
      ...progress.sessions.filter((item) => item.id !== session.id),
    ]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, MAX_RECENT_SESSIONS),
    attempts:
      added.length > 0 ? [...progress.attempts, ...added] : progress.attempts,
    mistakePatterns:
      added.length > 0
        ? recordMistakes(
            progress.mistakePatterns,
            added,
            progress.settings.masteryThreshold,
          )
        : progress.mistakePatterns,
    statistics:
      added.length > 0
        ? addAttemptsToStatistics(progress.statistics, added)
        : progress.statistics,
  }
}
