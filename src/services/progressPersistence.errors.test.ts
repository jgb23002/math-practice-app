import { expect, test } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import { createMistakePattern } from '../test/mistakeFixtures'
import { memoryStorage } from '../test/storageFixtures'
import { createStatisticsProgress } from '../test/statisticsFixtures'
import { createEmptyStatistics } from '../utils/statistics'
import {
  createProgressPersistence,
  loadStoredProgress,
  saveStoredProgress,
  SAVE_WARNING,
} from './progressPersistence'

function storedFixture() {
  const fixture = memoryStorage({ 'another.app': 'untouched' })
  const progress = createStatisticsProgress()
  progress.mistakePatterns = [createMistakePattern()]
  expect(saveStoredProgress(fixture.storage, progress)).toBe(true)
  return { ...fixture, progress: loadStoredProgress(fixture.storage).progress }
}

test.each([
  'settings',
  'attempts',
  'sessions',
  'mistakePatterns',
  'statistics',
] as const)(
  'corrupted JSON in %s resets only that category and retains unrelated data',
  (category) => {
    const { storage, data, progress } = storedFixture()
    data.set(STORAGE_KEYS[category], '{ this is not JSON')
    const loaded = loadStoredProgress(storage)
    expect(loaded.warning).toMatch(/kept the parts we could/)
    for (const other of [
      'settings',
      'attempts',
      'sessions',
      'mistakePatterns',
      'statistics',
    ] as const)
      if (other !== category)
        expect(loaded.progress[other]).toEqual(progress[other])
    if (category === 'statistics')
      expect(loaded.progress.statistics).toEqual(progress.statistics)
    expect(saveStoredProgress(storage, loaded.progress)).toBe(true)
    expect(data.get('another.app')).toBe('untouched')
    expect(loadStoredProgress(storage).progress).toEqual(loaded.progress)
  },
)

test.each([
  ['settings', { soundEnabled: 'true' }],
  ['settings', { defaultDifficulty: 9 }],
  ['settings', { defaultOperations: ['division', 'division'] }],
  ['settings', { defaultSessionLength: -1 }],
  ['settings', { masteryThreshold: 0 }],
] as const)(
  'invalid %s fields %j reset preferences without erasing history',
  (category, patch) => {
    const { storage, data, progress } = storedFixture()
    data.set(
      STORAGE_KEYS[category],
      JSON.stringify({ ...progress.settings, ...patch }),
    )
    const loaded = loadStoredProgress(storage)
    expect(loaded.warning).toBeTruthy()
    expect(loaded.progress.settings).not.toEqual(progress.settings)
    expect(loaded.progress.attempts).toEqual(progress.attempts)
    expect(loaded.progress.sessions).toEqual(progress.sessions)
    expect(loaded.progress.statistics).toEqual(progress.statistics)
    expect(loaded.progress.mistakePatterns).toEqual(progress.mistakePatterns)
  },
)

test.each([
  { operation: 'unknown' },
  { selfReportedCorrect: 'false' },
  { selectedAnswer: -1 },
  { source: 'mistake-review', mistakePatternId: '' },
  { attemptedAt: 'last week' },
  {
    operation: 'division',
    firstOperand: 5,
    secondOperand: 0,
    correctAnswer: 1,
  },
  {
    operation: 'division',
    firstOperand: 5,
    secondOperand: 2,
    correctAnswer: 2.5,
  },
  {
    operation: 'subtraction',
    firstOperand: 2,
    secondOperand: 5,
    correctAnswer: -3,
  },
])(
  'salvages valid attempts around malformed arithmetic/metadata %j',
  (patch) => {
    const { storage, data, progress } = storedFixture()
    data.set(
      STORAGE_KEYS.attempts,
      JSON.stringify([
        null,
        progress.attempts[0],
        { ...progress.attempts[1], ...patch },
        ...progress.attempts.slice(2),
      ]),
    )
    const loaded = loadStoredProgress(storage)
    expect(loaded.progress.attempts).toEqual([
      progress.attempts[0],
      ...progress.attempts.slice(2),
    ])
    expect(loaded.progress.statistics).toEqual(progress.statistics)
    expect(loaded.progress.settings).toEqual(progress.settings)
    expect(loaded.progress.mistakePatterns).toEqual(progress.mistakePatterns)
    expect(loaded.warning).toMatch(/kept the parts/)
  },
)

test('deduplicates attempt IDs and scoped question IDs without inferring new mastery or summing results', () => {
  const { storage, data, progress } = storedFixture()
  const original = progress.attempts[0]
  data.set(
    STORAGE_KEYS.attempts,
    JSON.stringify([
      original,
      { ...original, id: 'new-id', selfReportedCorrect: false },
      { ...progress.attempts[1], id: original.id },
      ...progress.attempts.slice(1),
    ]),
  )
  const loaded = loadStoredProgress(storage)
  expect(loaded.progress).toEqual(progress)
  expect(loaded.warning).toBeTruthy()
})

test.each([
  { difficulty: 5 },
  { attempted: 99 },
  { correct: -1 },
  { operations: [] },
  { completedAt: '2025-01-01T00:00:00.000Z' },
  { id: '' },
  { sessionLength: 7 },
])(
  'preserves readable sessions when a neighboring session is invalid %j',
  (patch) => {
    const { storage, data, progress } = storedFixture()
    data.set(
      STORAGE_KEYS.sessions,
      JSON.stringify([
        null,
        progress.sessions[0],
        { ...progress.sessions[1], ...patch },
        ...progress.sessions.slice(2),
        progress.sessions[0],
      ]),
    )
    const loaded = loadStoredProgress(storage)
    expect(loaded.progress.sessions).toEqual([
      progress.sessions[0],
      ...progress.sessions.slice(2),
    ])
    expect(loaded.progress.attempts).toEqual(progress.attempts)
    expect(loaded.progress.statistics).toEqual(progress.statistics)
    expect(loaded.progress.settings).toEqual(progress.settings)
  },
)

test('salvages valid mistake patterns without changing their recorded mastery', () => {
  const { storage, data, progress } = storedFixture()
  const mastered = createMistakePattern({
    id: 'mastered',
    firstOperand: 2,
    correctAnswer: 6,
    mastered: true,
    similarCorrectCount: 3,
  })
  data.set(
    STORAGE_KEYS.mistakePatterns,
    JSON.stringify([
      null,
      ...progress.mistakePatterns,
      { ...mastered, incorrectCount: -1 },
      mastered,
      { ...mastered, id: 'duplicate', incorrectCount: 4 },
    ]),
  )
  const loaded = loadStoredProgress(storage)
  expect(loaded.progress.mistakePatterns).toEqual([
    ...progress.mistakePatterns,
    { ...mastered, incorrectCount: 4 },
  ])
  expect(loaded.progress.attempts).toEqual(progress.attempts)
  expect(loaded.progress.statistics).toEqual(progress.statistics)
  expect(loaded.warning).toBeTruthy()
})

test.each(['result', 'operation', 'difficulty'] as const)(
  'repairs a same-sized but inconsistent %s statistics cache from readable attempts',
  (group) => {
    const { storage, data, progress } = storedFixture()
    const corrupt = structuredClone(progress.statistics)
    if (group === 'result') {
      for (const totals of [
        corrupt,
        ...Object.values(corrupt.byOperation),
        ...Object.values(corrupt.byDifficulty),
      ]) {
        totals.correct = totals.attempted
        totals.incorrect = 0
      }
    } else if (group === 'operation')
      [corrupt.byOperation.addition, corrupt.byOperation.multiplication] = [
        corrupt.byOperation.multiplication,
        corrupt.byOperation.addition,
      ]
    else
      [corrupt.byDifficulty[1], corrupt.byDifficulty[4]] = [
        corrupt.byDifficulty[4],
        corrupt.byDifficulty[1],
      ]
    data.set(STORAGE_KEYS.statistics, JSON.stringify(corrupt))
    const loaded = loadStoredProgress(storage)
    expect(loaded.progress.statistics).toEqual(progress.statistics)
    expect(loaded.progress.attempts).toEqual(progress.attempts)
    expect(loaded.warning).toBeTruthy()
  },
)

test('all-invalid history with corrupt statistics safely produces zero totals without touching preferences', () => {
  const { storage, data, progress } = storedFixture()
  data.set(STORAGE_KEYS.attempts, '[null,{},42]')
  data.set(STORAGE_KEYS.statistics, '{broken')
  const loaded = loadStoredProgress(storage)
  expect(loaded.progress.attempts).toEqual([])
  expect(loaded.progress.statistics).toEqual(createEmptyStatistics())
  expect(loaded.progress.settings).toEqual(progress.settings)
  expect(loaded.progress.sessions).toEqual(progress.sessions)
})

test('a throwing localStorage getter never escapes and disables writes without deleting data', () => {
  const { storage, access, data } = storedFixture()
  const before = [...data]
  access.getItem.mockImplementation(() => {
    throw new DOMException('Sensitive stack trace', 'SecurityError')
  })
  const persistence = createProgressPersistence(storage)
  expect(persistence.getWarning()).toBe(SAVE_WARNING)
  expect(persistence.saveSession(persistence.initial, null)).toBe(false)
  expect(persistence.getWarning()).not.toContain('Sensitive')
  expect([...data]).toEqual(before)
  expect(access.removeItem).not.toHaveBeenCalled()
})

test('invalid recovery cannot hide the warning that an unsupported schema disables saving', () => {
  const { storage, data } = storedFixture()
  data.set(STORAGE_KEYS.version, '{"version":99}')
  data.set(STORAGE_KEYS.activeSession, '{broken')
  const persistence = createProgressPersistence(storage)
  expect(persistence.getWarning()).toMatch(/new progress won’t be saved/)
  expect(persistence.saveSession(persistence.initial, null)).toBe(false)
})
