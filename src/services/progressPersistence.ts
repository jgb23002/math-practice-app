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
  isSessionHistory,
} from '../utils/storageValidation'
import type { JsonStorage } from './storage'

export { createEmptyStatistics } from '../utils/statistics'

export const SAVE_WARNING =
  'We can’t save your progress on this device right now. You can keep practicing, but new progress may be lost when you close this page.'
const RECOVERY_WARNING =
  'Some saved progress couldn’t be read. We’ve kept the parts we could, and you can keep practicing.'
const VERSION_WARNING =
  'This saved progress uses a version we can’t update. You can keep practicing, but new progress won’t be saved.'

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
  const sessions = storage.read(STORAGE_KEYS.sessions, isSessionHistory)
  const attempts = storage.read(STORAGE_KEYS.attempts, isAttemptHistory)
  const statistics = storage.read(STORAGE_KEYS.statistics, isAppStatistics)
  const results = [settings, sessions, attempts, statistics]
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
        ? [...sessions.value]
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, MAX_RECENT_SESSIONS)
        : [],
    attempts: attempts.status === 'valid' ? attempts.value : [],
    statistics:
      statistics.status === 'valid'
        ? statistics.value
        : createEmptyStatistics(),
  }
  // Repair a missing/corrupt or lagging cache from readable attempts. A larger
  // valid aggregate may include history whose detail category was lost; retain
  // it rather than erasing unaffected totals after that category recovers.
  if (
    attempts.status === 'valid' &&
    (statistics.status !== 'valid' ||
      statistics.value.attempted < attempts.value.length)
  )
    progress.statistics = calculateStatistics(attempts.value)
  if (writable)
    for (let from = versionNumber; from < STORAGE_VERSION; from++)
      progress = migrations[from](progress)
  const warning = unavailable
    ? SAVE_WARNING
    : !writable
      ? VERSION_WARNING
      : results.some((result) => result.status === 'invalid')
        ? RECOVERY_WARNING
        : null
  return { progress, writable, warning }
}

export function saveStoredProgress(
  storage: JsonStorage,
  progress: StoredProgress,
) {
  const version = storage.read(STORAGE_KEYS.version, isVersion)
  if (
    version.status !== 'missing' &&
    (version.status !== 'valid' || version.value.version > STORAGE_VERSION)
  )
    return false
  // Keep categories independent: one failed write must not prevent the others.
  const results = [
    isAppSettings(progress.settings) &&
      storage.write(STORAGE_KEYS.settings, progress.settings).ok,
    isSessionHistory(progress.sessions) &&
      storage.write(STORAGE_KEYS.sessions, progress.sessions).ok,
    isAttemptHistory(progress.attempts) &&
      storage.write(STORAGE_KEYS.attempts, progress.attempts).ok,
    isAppStatistics(progress.statistics) &&
      storage.write(STORAGE_KEYS.statistics, progress.statistics).ok,
  ]
  if (!results.every(Boolean)) return false
  return storage.write(STORAGE_KEYS.version, { version: STORAGE_VERSION }).ok
}

/** Observable save status for React's external-store subscription. */
export function createProgressPersistence(storage: JsonStorage) {
  const loaded = loadStoredProgress(storage)
  let warning = loaded.warning
  const listeners = new Set<() => void>()
  return {
    initial: loaded.progress,
    getWarning: () => warning,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    save: (progress: StoredProgress) => {
      if (!loaded.writable) return false
      const saved = saveStoredProgress(storage, progress)
      const nextWarning = saved ? loaded.warning : SAVE_WARNING
      if (nextWarning !== warning) {
        warning = nextWarning
        for (const listener of listeners) listener()
      }
      return saved
    },
  }
}

/** Upsert session metadata and append new attempts without recounting old ones. */
export function withSessionProgress(
  progress: StoredProgress,
  session: PracticeSessionState,
): StoredProgress {
  const knownIds = new Set(progress.attempts.map((attempt) => attempt.id))
  const added = session.attempts.filter((attempt) => !knownIds.has(attempt.id))
  const metadata = {
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
    attempts: [...progress.attempts, ...added],
    statistics:
      added.length > 0
        ? addAttemptsToStatistics(progress.statistics, added)
        : progress.statistics,
  }
}
