import { expect, test } from 'vitest'
import { createCompletedSession } from '../test/sessionFixtures'
import {
  createStatisticsAttempt,
  createStatisticsProgress,
} from '../test/statisticsFixtures'
import {
  addAttemptsToStatistics,
  calculateAccuracy,
  calculateStatistics,
  createEmptyStatistics,
  formatAccuracy,
  getRecentSessions,
} from './statistics'

test.each([
  [0, 0, 0],
  [0, 5, 0],
  [5, 5, 100],
  [1, 3, 100 / 3],
  [2, 3, 200 / 3],
  [5, 8, 62.5],
  [19, 20, 95],
])('%s correct out of %s gives %s percent', (correct, attempted, expected) => {
  const result = calculateAccuracy(correct, attempted)
  expect(result).toBeCloseTo(expected, 10)
  expect(Number.isFinite(result)).toBe(true)
})

test.each([
  [0, 0, '0%'],
  [1, 3, '33%'],
  [2, 3, '67%'],
  [5, 8, '63%'],
  [1, 1, '100%'],
])('formats %s out of %s as %s', (correct, attempted, expected) => {
  expect(
    formatAccuracy({
      correct: Number(correct),
      attempted: Number(attempted),
      incorrect: Number(attempted) - Number(correct),
    }),
  ).toBe(expected)
})

test('an empty history contains every operation and level with safe zero accuracy', () => {
  const stats = calculateStatistics([])
  expect(stats).toMatchObject({ attempted: 0, correct: 0, incorrect: 0 })
  expect(Object.keys(stats.byOperation)).toEqual([
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ])
  expect(Object.keys(stats.byDifficulty)).toEqual(['1', '2', '3', '4'])
  for (const totals of [
    stats,
    ...Object.values(stats.byOperation),
    ...Object.values(stats.byDifficulty),
  ]) {
    expect(totals).toMatchObject({ attempted: 0, correct: 0, incorrect: 0 })
    expect(formatAccuracy(totals)).toBe('0%')
  }
})

for (const operation of [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const)
  for (const difficulty of [1, 2, 3, 4] as const)
    test(`tracks ${operation} at level ${difficulty} using self-reports`, () => {
      const stats = calculateStatistics([
        createStatisticsAttempt(operation, difficulty, 1, true),
        createStatisticsAttempt(operation, difficulty, 2, true),
        createStatisticsAttempt(operation, difficulty, 3, false),
      ])
      expect(stats).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 })
      expect(stats.byOperation[operation]).toEqual({
        attempted: 3,
        correct: 2,
        incorrect: 1,
      })
      expect(stats.byDifficulty[difficulty]).toEqual({
        attempted: 3,
        correct: 2,
        incorrect: 1,
      })
      expect(calculateAccuracy(stats.correct, stats.attempted)).toBeCloseTo(
        200 / 3,
      )
      for (const [key, value] of Object.entries(stats.byOperation))
        if (key !== operation) expect(value.attempted).toBe(0)
      for (const [key, value] of Object.entries(stats.byDifficulty))
        if (Number(key) !== difficulty) expect(value.attempted).toBe(0)
    })

test('calculates independent mixed-operation and difficulty totals from recorded attempts', () => {
  const fixture = createStatisticsProgress()
  expect(calculateStatistics(fixture.attempts)).toEqual(fixture.statistics)
})

test('incremental totals match one batch, preserve a prior aggregate, and leave input unchanged', () => {
  const attempts = createStatisticsProgress().attempts
  const base = calculateStatistics(attempts.slice(0, 4))
  const snapshot = structuredClone(base)
  Object.freeze(base)
  Object.freeze(attempts)
  const updated = addAttemptsToStatistics(base, attempts.slice(4))
  expect(updated).toEqual(calculateStatistics(attempts))
  expect(base).toEqual(snapshot)
  expect(updated.byOperation).not.toBe(base.byOperation)
  expect(updated.byDifficulty).not.toBe(base.byDifficulty)
  expect(createEmptyStatistics().byOperation.addition).not.toBe(
    createEmptyStatistics().byOperation.subtraction,
  )
})

test('sorts recent sessions by start date, newest first, without mutating history', () => {
  const sessions = Object.freeze(createStatisticsProgress().sessions)
  const snapshot = [...sessions]
  expect(getRecentSessions(sessions).map((item) => item.id)).toEqual([
    'session-4',
    'session-3',
    'session-2',
    'session-1',
  ])
  expect(sessions).toEqual(snapshot)
  expect(getRecentSessions([])).toEqual([])
})

test('uses start dates rather than completion dates to order overlapping sessions', () => {
  const first = createCompletedSession([], {
    id: 'first',
    startedAt: '2026-10-20T12:00:00.000Z',
    completedAt: '2026-10-20T14:00:00.000Z',
  })
  const second = createCompletedSession([], {
    id: 'second',
    startedAt: '2026-10-20T13:00:00.000Z',
    completedAt: '2026-10-20T13:05:00.000Z',
  })
  expect(getRecentSessions([first, second]).map((item) => item.id)).toEqual([
    'second',
    'first',
  ])
})
