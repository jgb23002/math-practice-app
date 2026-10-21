import { expect, test } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import {
  recoveryFixture,
  recoverySnapshot,
  reportRecoveryAnswer,
} from '../test/recoveryFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import { createMistakePattern } from '../test/mistakeFixtures'
import {
  createProgressPersistence,
  saveStoredProgress,
  withSessionProgress,
  SAVE_WARNING,
} from './progressPersistence'
import {
  createPracticeSession,
  transitionPracticeSession,
} from './practiceSession'
import { resolveSessionRecovery } from './sessionRecovery'

test.each([5, 10, 20, 'continuous'] as const)(
  'round-trips live %s cards including zero selection, reveal and exact progress',
  (length) => {
    const { storage, data } = memoryStorage({ 'other.app': 'keep' })
    const { session, dependencies } = recoveryFixture(length)
    let current = session
    for (let index = 0; index < 3; index++) {
      current = reportRecoveryAnswer(current, dependencies, index % 2 === 0)
      const snapshot = recoverySnapshot({
        ...current,
        selectedAnswer: current.currentQuestion!.choices[0],
        isAnswerRevealed: true,
      })
      const persistence = createProgressPersistence(storage)
      expect(persistence.saveSession(snapshot.progress, snapshot.session)).toBe(
        true,
      )
      const reload = createProgressPersistence(storage)
      expect(reload.recoveredSession).toEqual(snapshot.session)
      expect(reload.initial).toEqual(snapshot.progress)
      expect(reload.initial.statistics.attempted).toBe(index + 1)
      expect(reload.saveSession(reload.initial, reload.recoveredSession)).toBe(
        true,
      )
      expect(createProgressPersistence(storage).initial).toEqual(
        snapshot.progress,
      )
    }
    expect(data.get('other.app')).toBe('keep')
  },
)

test.each([
  'settings',
  'sessions',
  'attempts',
  'statistics',
  'mistakePatterns',
  'version',
] as const)(
  'atomic checkpoint recovers interrupted %s write without repeating a mistake',
  (failed) => {
    const { storage, access, data } = memoryStorage()
    const { session, dependencies } = recoveryFixture()
    const initial = recoverySnapshot(session)
    const persistence = createProgressPersistence(storage)
    persistence.saveSession(initial.progress, session)
    const write = access.setItem.getMockImplementation()!
    access.setItem.mockImplementation((key, value) => {
      if (key === STORAGE_KEYS[failed]) throw new Error('Storage full')
      write(key, value)
    })
    const next = reportRecoveryAnswer(session, dependencies)
    const progress = withSessionProgress(initial.progress, next)
    // Ensure each targeted category really changes and exercises setItem.
    progress.settings.soundEnabled = true
    if (failed === 'version') data.delete(STORAGE_KEYS.version)
    expect(persistence.saveSession(progress, next)).toBe(false)
    expect(persistence.getWarning()).toBe(SAVE_WARNING)
    access.setItem.mockImplementation(write)
    const reload = createProgressPersistence(storage)
    expect(reload.recoveredSession).toEqual(next)
    expect(reload.initial).toEqual(progress)
    expect(reload.initial.mistakePatterns[0].incorrectCount).toBe(1)
    expect(reload.saveSession(reload.initial, reload.recoveredSession)).toBe(
      true,
    )
    expect(createProgressPersistence(storage).initial).toEqual(progress)
  },
)

test('checkpoint write failure leaves all durable categories untouched and warns', () => {
  const { storage, access, data } = memoryStorage()
  const { session } = recoveryFixture()
  const snapshot = recoverySnapshot(session)
  const persistence = createProgressPersistence(storage)
  const before = [...data]
  access.setItem.mockImplementation(() => {
    throw new Error('Full')
  })
  expect(persistence.saveSession(snapshot.progress, session)).toBe(false)
  expect([...data]).toEqual(before)
  expect(access.setItem.mock.calls.map(([key]) => key)).toEqual([
    STORAGE_KEYS.activeSession,
  ])
  expect(persistence.getWarning()).toBe(SAVE_WARNING)
})

test('an interrupted mastery write restores the accepted review without incrementing its original pattern twice', () => {
  const { storage, access } = memoryStorage()
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern({ similarCorrectCount: 1 })]
  const dependencies = {
    mistakePatterns: progress.mistakePatterns,
    masteryThreshold: 3,
  }
  const session = createPracticeSession(
    {
      mode: 'mistake-review',
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    },
    dependencies,
  )
  const initial = withSessionProgress(progress, session)
  const persistence = createProgressPersistence(storage)
  expect(persistence.saveSession(initial, session)).toBe(true)
  const next = reportRecoveryAnswer(session, dependencies, true)
  const recorded = withSessionProgress(initial, next)
  const write = access.setItem.getMockImplementation()!
  access.setItem.mockImplementation((key, value) => {
    if (key === STORAGE_KEYS.mistakePatterns) throw new Error('Full')
    write(key, value)
  })
  expect(persistence.saveSession(recorded, next)).toBe(false)
  access.setItem.mockImplementation(write)
  const reload = createProgressPersistence(storage)
  expect(reload.recoveredSession).toEqual(next)
  expect(reload.initial.mistakePatterns[0]).toMatchObject({
    similarCorrectCount: 2,
    mastered: false,
    incorrectCount: 1,
  })
  expect(reload.initial.attempts).toHaveLength(1)
  expect(reload.saveSession(reload.initial, reload.recoveredSession)).toBe(true)
  expect(createProgressPersistence(storage).initial).toEqual(recorded)
})

test.each(['write', 'remove'] as const)(
  'completion tombstone prevents resurrection after a failed %s',
  (failure) => {
    const { storage, access, data } = memoryStorage()
    const { session, dependencies } = recoveryFixture('continuous')
    const snapshot = recoverySnapshot(
      reportRecoveryAnswer(session, dependencies),
    )
    const persistence = createProgressPersistence(storage)
    persistence.saveSession(snapshot.progress, snapshot.session)
    const write = access.setItem.getMockImplementation()!
    const remove = access.removeItem.getMockImplementation()!
    if (failure === 'write')
      access.setItem.mockImplementation((key, value) => {
        if (key === STORAGE_KEYS.sessions) throw new Error('Full')
        write(key, value)
      })
    else
      access.removeItem.mockImplementation(() => {
        throw new Error('Blocked')
      })
    const completed = transitionPracticeSession(
      snapshot.session!,
      { type: 'end', sessionId: session.id },
      dependencies,
    )
    const progress = withSessionProgress(snapshot.progress, completed)
    expect(persistence.saveSession(progress, completed)).toBe(false)
    expect(JSON.parse(data.get(STORAGE_KEYS.activeSession)!).session).toBeNull()
    const reload = createProgressPersistence(storage)
    expect(reload.recoveredSession).toBeNull()
    expect(reload.initial).toEqual(progress)
    access.setItem.mockImplementation(write)
    access.removeItem.mockImplementation(remove)
    expect(reload.saveSession(reload.initial, null)).toBe(true)
    expect(data.has(STORAGE_KEYS.activeSession)).toBe(false)
    expect(createProgressPersistence(storage).initial).toEqual(progress)
  },
)

test.each(['{broken', 'null', '{"version":99}', '{"version":1,"session":{}}'])(
  'invalid recovery %s preserves independent stored progress',
  (value) => {
    const { storage, data } = memoryStorage()
    const { session, dependencies } = recoveryFixture()
    const snapshot = recoverySnapshot(
      reportRecoveryAnswer(session, dependencies),
    )
    saveStoredProgress(storage, snapshot.progress)
    data.set(STORAGE_KEYS.activeSession, value)
    const reload = createProgressPersistence(storage)
    expect(reload.recoveredSession).toBeNull()
    expect(reload.initial).toEqual(snapshot.progress)
    expect(reload.getWarning()).toMatch(/couldn’t be restored/)
    expect(reload.saveSession(reload.initial, null)).toBe(true)
    expect(data.has(STORAGE_KEYS.activeSession)).toBe(false)
  },
)

test('durable completion overrides an old active checkpoint', () => {
  const { session, dependencies } = recoveryFixture()
  const snapshot = recoverySnapshot(session)
  const ended = transitionPracticeSession(
    session,
    { type: 'end', sessionId: session.id },
    dependencies,
  )
  const durable = withSessionProgress(snapshot.progress, ended)
  expect(resolveSessionRecovery(snapshot, durable)).toEqual({
    progress: durable,
    session: null,
  })
})

test('a recorded durable card advances an older cursor rather than presenting it again', () => {
  const { session, dependencies } = recoveryFixture()
  const snapshot = recoverySnapshot(session)
  const next = reportRecoveryAnswer(session, dependencies)
  const durable = withSessionProgress(snapshot.progress, next)
  const recovered = resolveSessionRecovery(snapshot, durable)
  expect(recovered.progress).toEqual(durable)
  expect(recovered.session).toMatchObject({
    attempted: 1,
    incorrect: 1,
    attempts: next.attempts,
    selectedAnswer: null,
    isAnswerRevealed: false,
  })
  expect(recovered.session?.currentQuestion?.id).not.toBe(
    session.currentQuestion!.id,
  )
  expect(withSessionProgress(durable, recovered.session!).statistics).toEqual(
    durable.statistics,
  )
})

test('conflicting durable attempts are retained without replaying their card', () => {
  const { session, dependencies } = recoveryFixture()
  const next = reportRecoveryAnswer(session, dependencies)
  const snapshot = recoverySnapshot(next)
  const durable = structuredClone(snapshot.progress)
  durable.attempts[0].selectedAnswer = 2
  expect(resolveSessionRecovery(snapshot, durable)).toEqual({
    progress: durable,
    session: null,
  })
})

test('an older cursor with a full durable ledger completes without an extra card or attempt', () => {
  const { storage, data } = memoryStorage()
  const { session, dependencies } = recoveryFixture()
  const snapshot = recoverySnapshot(session)
  let next = session
  for (let index = 0; index < 5; index++)
    next = reportRecoveryAnswer(next, dependencies, true)
  const durable = withSessionProgress(snapshot.progress, next)
  // Simulate a legacy interrupted completion with attempts saved before metadata.
  durable.sessions = snapshot.progress.sessions
  saveStoredProgress(storage, durable)
  data.set(STORAGE_KEYS.activeSession, JSON.stringify(snapshot))
  const reload = createProgressPersistence(storage)
  expect(reload.recoveredSession).toBeNull()
  expect(reload.initial.statistics.attempted).toBe(5)
  expect(reload.initial.attempts).toHaveLength(5)
  expect(reload.initial.sessions[0]).toMatchObject({
    attempted: 5,
    correct: 5,
    completedAt: expect.any(String),
  })
  expect(reload.saveSession(reload.initial, null)).toBe(true)
  expect(data.has(STORAGE_KEYS.activeSession)).toBe(false)
})

test('unsupported global versions protect existing recovery and category data from writes', () => {
  const { storage, data, access } = memoryStorage()
  const snapshot = recoverySnapshot()
  saveStoredProgress(storage, snapshot.progress)
  data.set(STORAGE_KEYS.activeSession, JSON.stringify(snapshot))
  data.set(STORAGE_KEYS.version, '{"version":99}')
  access.setItem.mockClear()
  const before = [...data]
  const reload = createProgressPersistence(storage)
  expect(reload.recoveredSession).toBeNull()
  expect(reload.saveSession(snapshot.progress, snapshot.session)).toBe(false)
  expect(reload.getWarning()).toMatch(/won’t be saved/)
  expect([...data]).toEqual(before)
  expect(access.setItem).not.toHaveBeenCalled()
})

test('a fresh attempt id cannot count the same session/question pair twice', () => {
  const { session, dependencies } = recoveryFixture()
  const next = reportRecoveryAnswer(session, dependencies)
  const snapshot = recoverySnapshot(next)
  const replay = { ...next, attempts: [{ ...next.attempts[0], id: 'new-id' }] }
  const again = withSessionProgress(snapshot.progress, replay)
  expect(again.attempts).toEqual(snapshot.progress.attempts)
  expect(again.statistics).toEqual(snapshot.progress.statistics)
  expect(again.mistakePatterns).toEqual(snapshot.progress.mistakePatterns)
})
