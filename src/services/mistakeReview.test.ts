import { expect, test } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import {
  getActiveMistakePatterns,
  getReviewPatterns,
  mistakePriority,
  prioritizeMistakePatterns,
} from './mistakeReview'

const now = Date.parse('2026-10-21T12:00:00.000Z')

test('filters mastered/invalid patterns and applies selected skills and difficulty', () => {
  const active = createMistakePattern()
  const higher = createMistakePattern({ id: 'higher', difficulty: 2 })
  const other = createMistakePattern({
    id: 'multiply',
    operation: 'multiplication',
    correctAnswer: 12,
  })
  const patterns = [
    active,
    higher,
    other,
    createMistakePattern({
      id: 'mastered',
      mastered: true,
      similarCorrectCount: 3,
    }),
    createMistakePattern({ id: 'invalid', incorrectCount: -1 }),
  ]
  expect(getActiveMistakePatterns(patterns)).toEqual([active, higher, other])
  expect(
    getReviewPatterns(patterns, { operations: ['addition'], difficulty: 1 }),
  ).toEqual([active])
  expect(
    getReviewPatterns(patterns, { operations: ['division'], difficulty: 1 }),
  ).toEqual([])
})

test.each([
  {
    label: 'frequent misses',
    high: { incorrectCount: 20 },
    low: { incorrectCount: 1 },
  },
  {
    label: 'recent misses',
    high: { lastIncorrectAt: '2026-10-21T12:00:00.000Z' },
    low: { lastIncorrectAt: '2025-01-01T12:00:00.000Z' },
  },
  {
    label: 'less successful review',
    high: { similarCorrectCount: 0 },
    low: { similarCorrectCount: 2 },
  },
])('prioritizes $label independently', ({ high, low }) => {
  const important = createMistakePattern({ id: 'high', ...high })
  const lessImportant = createMistakePattern({ id: 'low', ...low })
  expect(mistakePriority(important, now)).toBeGreaterThan(
    mistakePriority(lessImportant, now),
  )
  for (const random of [() => 0, () => 1 - Number.EPSILON])
    expect(
      prioritizeMistakePatterns([lessImportant, important], { now, random }),
    ).toEqual([important, lessImportant])
})

test('randomizes similar priority fairly without changing the caller data', () => {
  const patterns = Object.freeze([
    Object.freeze(createMistakePattern({ id: 'one' })),
    Object.freeze(
      createMistakePattern({ id: 'two', firstOperand: 4, secondOperand: 3 }),
    ),
    Object.freeze(
      createMistakePattern({ id: 'three', firstOperand: 2, correctAnswer: 6 }),
    ),
  ])
  const low = prioritizeMistakePatterns(patterns, { now, random: () => 0 })
  const high = prioritizeMistakePatterns(patterns, {
    now,
    random: () => 1 - Number.EPSILON,
  })
  expect(low.map((pattern) => pattern.id)).not.toEqual(
    high.map((pattern) => pattern.id),
  )
  expect(new Set(low)).toEqual(new Set(patterns))
  expect(patterns.map((pattern) => pattern.id)).toEqual(['one', 'two', 'three'])
})

test('future timestamps have the current recency weight and invalid clocks fail clearly', () => {
  const current = createMistakePattern({
    lastIncorrectAt: '2026-10-21T12:00:00.000Z',
  })
  expect(
    mistakePriority(
      { ...current, lastIncorrectAt: '2027-10-21T12:00:00.000Z' },
      now,
    ),
  ).toBe(mistakePriority(current, now))
  expect(() => prioritizeMistakePatterns([current], { now: NaN })).toThrow(
    RangeError,
  )
})
