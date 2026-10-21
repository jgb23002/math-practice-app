import { expect, test } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createAttempt } from '../test/sessionFixtures'
import { createStatisticsAttempt } from '../test/statisticsFixtures'
import type { MathOperation } from '../types/question'
import { isMistakePatternHistory } from '../utils/storageValidation'
import { recordMistakes, recoverMistakePatterns } from './mistakeTracking'

const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const cases = operations.flatMap((operation) =>
  ([1, 2, 3, 4] as const).map((difficulty) => ({ operation, difficulty })),
)

test.each(cases)(
  'creates and updates $operation at difficulty $difficulty',
  ({ operation, difficulty }) => {
    const attempt = createStatisticsAttempt(operation, difficulty, 1, false)
    const created = recordMistakes([], [attempt])
    expect(created).toEqual([
      {
        id: expect.any(String),
        operation,
        difficulty,
        firstOperand: attempt.firstOperand,
        secondOperand: attempt.secondOperand,
        correctAnswer: attempt.correctAnswer,
        lastIncorrectAt: attempt.attemptedAt,
        incorrectCount: 1,
        similarCorrectCount: 0,
        mastered: false,
      },
    ])
    const repeated = recordMistakes(created, [
      {
        ...attempt,
        id: 'next-attempt',
        attemptedAt: '2026-10-21T12:01:00.000Z',
      },
    ])
    expect(repeated).toEqual([
      {
        ...created[0],
        incorrectCount: 2,
        lastIncorrectAt: '2026-10-21T12:01:00.000Z',
      },
    ])
    expect(isMistakePatternHistory(repeated)).toBe(true)
    expect(created[0].incorrectCount).toBe(1)
  },
)

test('uses the self-report even when it disagrees with the selected answer', () => {
  expect(
    recordMistakes(
      [],
      [createAttempt({ selectedAnswer: 6, selfReportedCorrect: true })],
    ),
  ).toEqual([])
  expect(
    recordMistakes(
      [],
      [createAttempt({ selectedAnswer: 7, selfReportedCorrect: false })],
    ),
  ).toHaveLength(1)
})

test('keeps one stable record across many attempts and sessions without mutating inputs', () => {
  const attempts = Array.from({ length: 100 }, (_, index) =>
    createAttempt({
      id: `attempt-${index}`,
      questionId: `question-${index}`,
      sessionId: `session-${index % 3}`,
      selfReportedCorrect: false,
      attemptedAt: new Date(Date.UTC(2026, 9, 20, 12, index)).toISOString(),
    }),
  )
  const first = recordMistakes([], [attempts[0]])
  const snapshot = structuredClone(first)
  Object.freeze(first[0])
  Object.freeze(attempts)
  const result = recordMistakes(first, attempts.slice(1))
  expect(result).toEqual([
    {
      ...first[0],
      incorrectCount: 100,
      lastIncorrectAt: attempts[99].attemptedAt,
    },
  ])
  expect(first).toEqual(snapshot)
})

test('distinguishes operation, either operand, ordered operands, and difficulty', () => {
  const attempts = [
    createAttempt({ selfReportedCorrect: false }),
    createAttempt({
      firstOperand: 4,
      secondOperand: 3,
      selfReportedCorrect: false,
    }),
    createAttempt({
      firstOperand: 2,
      correctAnswer: 6,
      selfReportedCorrect: false,
    }),
    createAttempt({
      secondOperand: 2,
      correctAnswer: 5,
      selfReportedCorrect: false,
    }),
    createAttempt({
      operation: 'multiplication',
      correctAnswer: 12,
      selfReportedCorrect: false,
    }),
    createAttempt({ difficulty: 2, selfReportedCorrect: false }),
  ]
  const patterns = recordMistakes([], attempts)
  expect(patterns).toHaveLength(6)
  expect(new Set(patterns.map((pattern) => pattern.id)).size).toBe(6)
  expect(isMistakePatternHistory(patterns)).toBe(true)
})

test.each([0, 2, 3])(
  'another incorrect report resets %i similar-correct answers and mastery',
  (count) => {
    const previous = createMistakePattern({
      incorrectCount: 4,
      similarCorrectCount: count,
      mastered: count >= 3,
    })
    const [updated] = recordMistakes(
      [previous],
      [createAttempt({ selfReportedCorrect: false })],
    )
    expect(updated).toEqual({
      ...previous,
      incorrectCount: 5,
      similarCorrectCount: 0,
      mastered: false,
    })
    // Regular correct reports do not implement similar-question mastery.
    expect(recordMistakes([previous], [createAttempt()])).toEqual([previous])
  },
)

test('stores zero operands and answers for all allowed operations', () => {
  for (const operation of operations) {
    const attempt = createAttempt({
      operation,
      firstOperand: 0,
      secondOperand: operation === 'division' ? 2 : 0,
      correctAnswer: 0,
      selectedAnswer: 0,
      selfReportedCorrect: false,
    })
    expect(isMistakePatternHistory(recordMistakes([], [attempt]))).toBe(true)
  }
})

test('keeps a maximal persisted count a safe integer on another report', () => {
  const result = recordMistakes(
    [createMistakePattern({ incorrectCount: Number.MAX_SAFE_INTEGER })],
    [createAttempt({ selfReportedCorrect: false })],
  )
  expect(result[0].incorrectCount).toBe(Number.MAX_SAFE_INTEGER)
  expect(isMistakePatternHistory(result)).toBe(true)
})

test('salvages valid records and deduplicates overlapping snapshots without summing counts', () => {
  const first = createMistakePattern({ incorrectCount: 5 })
  const latest = createMistakePattern({
    id: 'duplicate-fact',
    incorrectCount: 3,
    lastIncorrectAt: '2026-10-21T12:01:00.000Z',
  })
  const other = createMistakePattern({ id: 'other', difficulty: 2 })
  const recovered = recoverMistakePatterns([
    null,
    first,
    first,
    { bad: true },
    latest,
    other,
  ])
  expect(recovered).toEqual({
    recovered: true,
    patterns: [{ ...latest, id: first.id, incorrectCount: 5 }, other],
  })
  expect(recoverMistakePatterns(recovered.patterns)).toEqual({
    patterns: recovered.patterns,
    recovered: false,
  })
  expect(isMistakePatternHistory(recovered.patterns)).toBe(true)
})

test('drops an ambiguous ID collision while retaining other valid patterns', () => {
  const first = createMistakePattern()
  const other = createMistakePattern({ id: 'other', difficulty: 3 })
  expect(
    recoverMistakePatterns([first, { ...first, difficulty: 2 }, other]),
  ).toEqual({ patterns: [first, other], recovered: true })
})
