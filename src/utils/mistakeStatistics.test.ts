import { expect, test } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createMistakeStatisticsProgress } from '../test/mistakeStatisticsFixtures'
import { createAttempt } from '../test/sessionFixtures'
import { createStatisticsAttempt } from '../test/statisticsFixtures'
import {
  calculateMistakeStatistics,
  rankMistakePatterns,
} from './mistakeStatistics'

test('empty data returns zero metrics and no winners instead of an all-zero tie', () => {
  expect(calculateMistakeStatistics([], [])).toEqual({
    activePatterns: [],
    masteredPatterns: [],
    reviewAttempted: 0,
    reviewCorrect: 0,
    incorrectByOperation: {
      addition: 0,
      subtraction: 0,
      multiplication: 0,
      division: 0,
    },
    mostMissedOperations: [],
    mostMissedCount: 0,
  })
})

test('aggregates original-pattern miss counts including mastered patterns and all tied operations', () => {
  const { mistakePatterns, attempts } = createMistakeStatisticsProgress()
  const stats = calculateMistakeStatistics(mistakePatterns, attempts)
  expect(stats.activePatterns).toHaveLength(4)
  expect(stats.masteredPatterns).toHaveLength(1)
  expect(stats.incorrectByOperation).toEqual({
    addition: 8,
    subtraction: 5,
    multiplication: 8,
    division: 1,
  })
  expect(stats.mostMissedOperations).toEqual(['addition', 'multiplication'])
  expect(stats.mostMissedCount).toBe(8)
  // Review attempt operations can be inverses; they must not be added again.
  expect(stats.reviewAttempted).toBe(4)
  expect(stats.reviewCorrect).toBe(3)
})

test('review totals count self-reports rather than selected correctness or resettable mastery counters', () => {
  const { mistakePatterns, attempts } = createMistakeStatisticsProgress()
  expect(attempts[0].selectedAnswer).not.toBe(attempts[0].correctAnswer)
  expect(attempts[1].selectedAnswer).toBe(attempts[1].correctAnswer)
  for (const patterns of [
    mistakePatterns,
    [],
    mistakePatterns.map((pattern) => ({
      ...pattern,
      similarCorrectCount: 0,
      mastered: false,
    })),
  ]) {
    const stats = calculateMistakeStatistics(patterns, attempts)
    expect([stats.reviewAttempted, stats.reviewCorrect]).toEqual([4, 3])
  }
  expect(calculateMistakeStatistics(mistakePatterns, []).reviewAttempted).toBe(
    0,
  )
})

test.each(['addition', 'subtraction', 'multiplication', 'division'] as const)(
  'counts only review self-reports for %s',
  (operation) => {
    const attempts = [
      {
        ...createStatisticsAttempt(operation, 1, 1, true),
        source: 'mistake-review' as const,
      },
      {
        ...createStatisticsAttempt(operation, 1, 2, false),
        source: 'mistake-review' as const,
      },
      createStatisticsAttempt(operation, 1, 3, true),
    ]
    expect(calculateMistakeStatistics([], attempts)).toMatchObject({
      reviewAttempted: 2,
      reviewCorrect: 1,
    })
  },
)

test('ranks by descending incorrect counts with competition ranks and recent-first ties', () => {
  const { mistakePatterns } = createMistakeStatisticsProgress()
  const stats = calculateMistakeStatistics(mistakePatterns, [])
  expect(
    stats.activePatterns.map(({ pattern, rank }) => [pattern.id, rank]),
  ).toEqual([
    ['subtraction', 1],
    ['addition-one', 1],
    ['addition-two', 3],
    ['division', 4],
  ])
  expect(
    stats.masteredPatterns.map(({ pattern, rank }) => [pattern.id, rank]),
  ).toEqual([['multiplication', 1]])
})

test('incorrect count takes precedence over recency and sorting is numeric', () => {
  const recent = createMistakePattern({
    id: 'recent',
    incorrectCount: 2,
    lastIncorrectAt: '2026-10-21T12:00:00.000Z',
  })
  const frequent = createMistakePattern({
    id: 'frequent',
    incorrectCount: 10,
    lastIncorrectAt: '2025-01-01T12:00:00.000Z',
  })
  expect(
    rankMistakePatterns([recent, frequent]).map((item) => item.pattern.id),
  ).toEqual(['frequent', 'recent'])
})

test('equal count/date ties have deterministic operation, operand, difficulty, and ID order', () => {
  const patterns = [
    createMistakePattern({
      id: 'add-later',
      firstOperand: 4,
      secondOperand: 3,
    }),
    createMistakePattern({ id: 'add-high', difficulty: 2 }),
    createMistakePattern({ id: 'add-low' }),
    createMistakePattern({
      id: 'subtract',
      operation: 'subtraction',
      firstOperand: 7,
      secondOperand: 3,
      correctAnswer: 4,
    }),
  ]
  const expected = ['add-low', 'add-high', 'add-later', 'subtract']
  for (const input of [
    patterns,
    [...patterns].reverse(),
    [...patterns.slice(1), patterns[0]],
  ]) {
    const ranked = rankMistakePatterns(input)
    expect(ranked.map((item) => item.pattern.id)).toEqual(expected)
    expect(ranked.map((item) => item.rank)).toEqual([1, 1, 1, 1])
  }
})

test('same number fact at different difficulty levels remains separate', () => {
  const patterns = [
    createMistakePattern(),
    createMistakePattern({ id: 'level-two', difficulty: 2 }),
  ]
  const stats = calculateMistakeStatistics(patterns, [])
  expect(stats.activePatterns).toHaveLength(2)
  expect(stats.incorrectByOperation.addition).toBe(2)
})

test('reports every operation in a four-way positive tie and a sole winner when appropriate', () => {
  const { mistakePatterns } = createMistakeStatisticsProgress()
  const patterns = mistakePatterns
    .filter((pattern) => pattern.id !== 'addition-two')
    .map((pattern) => ({ ...pattern, incorrectCount: 4 }))
  expect(calculateMistakeStatistics(patterns, []).mostMissedOperations).toEqual(
    ['addition', 'subtraction', 'multiplication', 'division'],
  )
  expect(
    calculateMistakeStatistics(
      patterns.map((pattern) =>
        pattern.operation === 'division'
          ? { ...pattern, incorrectCount: 5 }
          : pattern,
      ),
      [],
    ),
  ).toMatchObject({ mostMissedOperations: ['division'], mostMissedCount: 5 })
})

test('mastery statistics follow recorded status and preserve pattern counts after attempt history resets', () => {
  const { mistakePatterns } = createMistakeStatisticsProgress()
  const stats = calculateMistakeStatistics(mistakePatterns, [])
  expect(stats.masteredPatterns[0].pattern.similarCorrectCount).toBe(3)
  expect(stats.activePatterns).toHaveLength(4)
  expect([stats.reviewAttempted, stats.reviewCorrect]).toEqual([0, 0])
  const reactivated = mistakePatterns.map((pattern) => ({
    ...pattern,
    mastered: false,
    similarCorrectCount: 0,
  }))
  expect(calculateMistakeStatistics(reactivated, []).masteredPatterns).toEqual(
    [],
  )
  expect(
    calculateMistakeStatistics(reactivated, []).activePatterns,
  ).toHaveLength(5)
})

test('legacy or orphan-attributed review history still counts without inventing patterns', () => {
  const attempts = [
    createAttempt({ source: 'mistake-review' }),
    createAttempt({
      id: 'other',
      source: 'mistake-review',
      mistakePatternId: 'missing-pattern',
    }),
  ]
  expect(calculateMistakeStatistics([], attempts)).toMatchObject({
    activePatterns: [],
    masteredPatterns: [],
    reviewAttempted: 2,
    reviewCorrect: 2,
  })
})

test('calculation and ranking do not mutate any caller arrays or records', () => {
  const progress = createMistakeStatisticsProgress()
  const patterns = Object.freeze(
    progress.mistakePatterns.map((pattern) => Object.freeze(pattern)),
  )
  const attempts = Object.freeze(
    progress.attempts.map((attempt) => Object.freeze(attempt)),
  )
  const before = JSON.stringify({ patterns, attempts })
  calculateMistakeStatistics(patterns, attempts)
  rankMistakePatterns(patterns)
  expect(JSON.stringify({ patterns, attempts })).toBe(before)
})
