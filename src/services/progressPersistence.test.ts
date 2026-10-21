import { expect, test } from 'vitest'
import {
  MAX_RECENT_SESSIONS,
  STORAGE_KEYS,
  STORAGE_VERSION,
} from '../config/storage'
import { createAttempt, createCompletedSession } from '../test/sessionFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import {
  createEmptyStatistics,
  loadStoredProgress,
  saveStoredProgress,
  SAVE_WARNING,
  withSessionProgress,
} from './progressPersistence'

function recordedProgress() {
  return withSessionProgress(
    emptyProgress(),
    createCompletedSession([
      createAttempt({
        id: 'first',
        questionId: 'first',
        selectedAnswer: 0,
        selfReportedCorrect: true,
      }),
      createAttempt({
        id: 'second',
        questionId: 'second',
        operation: 'division',
        firstOperand: 8,
        secondOperand: 2,
        correctAnswer: 4,
        selectedAnswer: 4,
        selfReportedCorrect: false,
      }),
    ]),
  )
}

test('loads older settings without the optional feedback preference without changing history or preferences', () => {
  const { storage } = memoryStorage()
  const progress = recordedProgress()
  delete progress.settings.feedbackEnabled
  progress.settings.soundEnabled = true
  progress.settings.defaultOperations = ['division']
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(loadStoredProgress(storage)).toEqual({
    progress,
    writable: true,
    warning: null,
  })
})

test('round-trips the disabled feedback preference without modifying other stored data', () => {
  const { storage } = memoryStorage()
  const progress = recordedProgress()
  progress.settings.feedbackEnabled = false
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(loadStoredProgress(storage).progress).toEqual(progress)
})

test('round-trips settings, attempts, completion, and aggregate statistics with schema version', () => {
  const { storage, data } = memoryStorage()
  const progress = recordedProgress()
  progress.settings.animationsEnabled = false
  progress.settings.defaultOperations = ['addition', 'division']
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(data.get(STORAGE_KEYS.version)).toBe(
    JSON.stringify({ version: STORAGE_VERSION }),
  )
  const loaded = loadStoredProgress(storage)
  expect(loaded).toMatchObject({ writable: true, warning: null, progress })
  expect(loaded.progress.statistics).toMatchObject({
    attempted: 2,
    correct: 1,
    incorrect: 1,
    byOperation: {
      addition: { attempted: 1, correct: 1, incorrect: 0 },
      division: { attempted: 1, correct: 0, incorrect: 1 },
    },
    byDifficulty: { 1: { attempted: 2, correct: 1, incorrect: 1 } },
  })
  expect(loaded.progress.sessions[0]).not.toHaveProperty('currentQuestion')
  expect(loaded.progress.attempts[0]).toMatchObject({
    selectedAnswer: 0,
    selfReportedCorrect: true,
  })
  expect(loaded.progress.attempts[1]).toMatchObject({
    selectedAnswer: 4,
    selfReportedCorrect: false,
  })
})

test('missing data loads independent defaults without writes during loading', () => {
  const { storage, access } = memoryStorage()
  expect(loadStoredProgress(storage)).toEqual({
    progress: emptyProgress(),
    writable: true,
    warning: null,
  })
  expect(access.setItem).not.toHaveBeenCalled()
})

test.each([
  'settings',
  'sessions',
  'attempts',
  'statistics',
  'mistakePatterns',
] as const)(
  'corrupt %s recovers independently and never deletes other categories',
  (category) => {
    const { storage, data } = memoryStorage({
      'unrelated.app': 'keep',
    })
    const original = recordedProgress()
    saveStoredProgress(storage, original)
    data.set(STORAGE_KEYS[category], '{broken')
    const loaded = loadStoredProgress(storage)
    expect(loaded.warning).toMatch(/kept the parts we could/)
    for (const other of [
      'settings',
      'sessions',
      'attempts',
      'statistics',
      'mistakePatterns',
    ] as const)
      if (other !== category)
        expect(loaded.progress[other]).toEqual(original[other])
    if (category === 'statistics')
      expect(loaded.progress.statistics).toEqual(original.statistics)
    else expect(loaded.progress[category]).toEqual(emptyProgress()[category])
    expect(saveStoredProgress(storage, loaded.progress)).toBe(true)
    expect(data.get('unrelated.app')).toBe('keep')
  },
)

test('valid aggregates survive loss of attempts and later reloads with new attempts', () => {
  const { storage, data } = memoryStorage()
  const original = recordedProgress()
  saveStoredProgress(storage, original)
  data.set(STORAGE_KEYS.attempts, 'null')
  const loaded = loadStoredProgress(storage).progress
  expect(loaded.statistics).toEqual(original.statistics)
  const next = withSessionProgress(
    loaded,
    createCompletedSession(
      [
        createAttempt({
          id: 'new',
          sessionId: 'new-session',
          questionId: 'new',
        }),
      ],
      { id: 'new-session' },
    ),
  )
  saveStoredProgress(storage, next)
  expect(loadStoredProgress(storage).progress.statistics).toMatchObject({
    attempted: 3,
    correct: 2,
    incorrect: 1,
  })
})

test.each([undefined, 0])(
  'migrates unversioned/v0 data (%s) without losing records',
  (version) => {
    const { storage, data } = memoryStorage()
    const progress = recordedProgress()
    saveStoredProgress(storage, progress)
    if (version === undefined) data.delete(STORAGE_KEYS.version)
    else data.set(STORAGE_KEYS.version, JSON.stringify({ version }))
    const loaded = loadStoredProgress(storage)
    expect(loaded.progress).toEqual(progress)
    expect(loaded.writable).toBe(true)
    saveStoredProgress(storage, loaded.progress)
    expect(JSON.parse(data.get(STORAGE_KEYS.version)!)).toEqual({ version: 1 })
  },
)

test.each(['{"version":99}', '{broken', 'null', '{"version":-1}'])(
  'protects unsupported/corrupt version metadata %s',
  (version) => {
    const { storage, data, access } = memoryStorage()
    const original = recordedProgress()
    saveStoredProgress(storage, original)
    data.set(STORAGE_KEYS.version, version)
    access.setItem.mockClear()
    const before = [...data.entries()]
    const loaded = loadStoredProgress(storage)
    expect(loaded.writable).toBe(false)
    expect(loaded.warning).toMatch(/won’t be saved/)
    expect(loaded.progress).toEqual(original)
    expect(saveStoredProgress(storage, emptyProgress())).toBe(false)
    expect([...data.entries()]).toEqual(before)
    expect(access.setItem).not.toHaveBeenCalled()
  },
)

test('a failed category write does not block other writes; retry repairs the snapshot', () => {
  const { storage, data, access } = memoryStorage()
  const progress = recordedProgress()
  const write = access.setItem.getMockImplementation()!
  access.setItem.mockImplementation((key, value) => {
    if (key === STORAGE_KEYS.attempts)
      throw new DOMException('Full', 'QuotaExceededError')
    write(key, value)
  })
  expect(saveStoredProgress(storage, progress)).toBe(false)
  expect(data.has(STORAGE_KEYS.sessions)).toBe(true)
  expect(data.has(STORAGE_KEYS.statistics)).toBe(true)
  expect(data.has(STORAGE_KEYS.version)).toBe(false)
  access.setItem.mockImplementation(write)
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(loadStoredProgress(storage).progress).toEqual(progress)
})

test('repairs missing/invalid/lagging statistics from completed attempts', () => {
  const { storage, data } = memoryStorage()
  const progress = recordedProgress()
  saveStoredProgress(storage, progress)
  for (const value of [
    undefined,
    'null',
    JSON.stringify(createEmptyStatistics()),
  ]) {
    if (value === undefined) data.delete(STORAGE_KEYS.statistics)
    else data.set(STORAGE_KEYS.statistics, value)
    expect(loadStoredProgress(storage).progress.statistics).toEqual(
      progress.statistics,
    )
  }
})

test('unavailable reads preserve storage and return a friendly warning', () => {
  const { storage, access } = memoryStorage()
  access.getItem.mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  expect(loadStoredProgress(storage)).toEqual({
    progress: emptyProgress(),
    writable: false,
    warning: SAVE_WARNING,
  })
  expect(access.setItem).not.toHaveBeenCalled()
})

test('upserts completion idempotently and caps recent sessions while retaining every attempt and aggregate', () => {
  let progress = emptyProgress()
  const count = MAX_RECENT_SESSIONS + 5
  for (let index = 0; index < count; index++) {
    const id = `session-${index}`
    const startedAt = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()
    const session = createCompletedSession(
      [
        createAttempt({
          id: `attempt-${index}`,
          questionId: `question-${index}`,
          sessionId: id,
          attemptedAt: startedAt,
        }),
      ],
      { id, startedAt, completedAt: startedAt },
    )
    progress = withSessionProgress(progress, session)
    progress = withSessionProgress(progress, session)
  }
  expect(progress.sessions).toHaveLength(MAX_RECENT_SESSIONS)
  expect(progress.sessions[0].id).toBe(`session-${count - 1}`)
  expect(progress.attempts).toHaveLength(count)
  expect(progress.statistics).toMatchObject({
    attempted: count,
    correct: count,
    incorrect: 0,
  })
  const { storage } = memoryStorage()
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(loadStoredProgress(storage).progress).toEqual(progress)
})
