import { expect, test } from 'vitest'
import { STORAGE_KEYS, MAX_RECENT_SESSIONS } from '../config/storage'
import { largeHistoryFixture } from '../test/largeHistoryFixture'
import { createMistakeStatisticsProgress } from '../test/mistakeStatisticsFixtures'
import { recoveryFixture, reportRecoveryAnswer } from '../test/recoveryFixtures'
import { memoryStorage } from '../test/storageFixtures'
import { calculateStatistics } from '../utils/statistics'
import { calculateMistakeStatistics } from '../utils/mistakeStatistics'
import {
  createProgressPersistence,
  loadStoredProgress,
  saveStoredProgress,
  withSessionProgress,
} from './progressPersistence'

test.each([5000, 10000])(
  'round-trips %i attempts, review totals and mastery while bounding metadata without discarding attempts',
  (count) => {
    const rich = createMistakeStatisticsProgress()
    const history = largeHistoryFixture(count)
    const attempts = [...rich.attempts, ...history.attempts]
    const progress = {
      ...rich,
      ...history,
      attempts,
      statistics: calculateStatistics(attempts),
    }
    const { storage, data } = memoryStorage()
    expect(saveStoredProgress(storage, progress)).toBe(true)
    const loaded = loadStoredProgress(storage)
    expect(loaded.warning).toBeNull()
    expect(loaded.progress.attempts).toEqual(attempts)
    expect(loaded.progress.sessions).toHaveLength(MAX_RECENT_SESSIONS)
    expect(loaded.progress.sessions[0].id).toBe(history.sessions.at(-1)!.id)
    expect(loaded.progress.sessions.at(-1)!.id).toBe(
      history.sessions.at(-MAX_RECENT_SESSIONS)!.id,
    )
    expect(loaded.progress.statistics).toEqual(progress.statistics)
    expect(
      calculateMistakeStatistics(
        loaded.progress.mistakePatterns,
        loaded.progress.attempts,
      ),
    ).toEqual(calculateMistakeStatistics(rich.mistakePatterns, rich.attempts))
    const { session, dependencies } = recoveryFixture()
    const persistence = createProgressPersistence(storage)
    const active = withSessionProgress(loaded.progress, session)
    expect(persistence.saveSession(active, session)).toBe(true)
    const reported = reportRecoveryAnswer(session, dependencies, true)
    const updated = withSessionProgress(active, reported)
    expect(persistence.saveSession(updated, reported)).toBe(true)
    const recovered = createProgressPersistence(storage)
    expect(recovered.initial).toEqual(updated)
    expect(recovered.recoveredSession).toEqual(reported)
    const replay = withSessionProgress(recovered.initial, reported)
    expect(replay.statistics).toEqual(updated.statistics)
    expect(replay.attempts).toHaveLength(count + rich.attempts.length + 1)
    expect(JSON.parse(data.get(STORAGE_KEYS.attempts)!)).toHaveLength(
      count + rich.attempts.length + 1,
    )
  },
)

test('larger aggregate totals survive independently lost older details at large history sizes', () => {
  const history = largeHistoryFixture()
  const rich = createMistakeStatisticsProgress()
  const progress = {
    ...rich,
    ...history,
    statistics: calculateStatistics(history.attempts),
  }
  const { storage } = memoryStorage()
  const detailedSubset = {
    ...progress,
    attempts: progress.attempts.slice(-100),
  }
  expect(saveStoredProgress(storage, detailedSubset)).toBe(true)
  expect(loadStoredProgress(storage).progress.statistics).toEqual(
    progress.statistics,
  )
})

test('revalidates a large checkpoint on every save, including a reused progress reference', () => {
  const history = largeHistoryFixture()
  const rich = createMistakeStatisticsProgress()
  const { session } = recoveryFixture()
  const progress = withSessionProgress(
    { ...rich, ...history, statistics: calculateStatistics(history.attempts) },
    session,
  )
  const { storage, data } = memoryStorage()
  const persistence = createProgressPersistence(storage)
  expect(persistence.saveSession(progress, session)).toBe(true)
  const saved = [...data]
  // A performance cache must never let a later invalid divisor bypass checks.
  progress.attempts[4999] = { ...progress.attempts[4999], secondOperand: 0 }
  expect(persistence.saveSession(progress, session)).toBe(false)
  expect([...data]).toEqual(saved)
  expect(persistence.getWarning()).toMatch(/can’t save/)
})
