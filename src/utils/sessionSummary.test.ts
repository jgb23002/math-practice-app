import { expect, test } from 'vitest'
import { createAttempt, createCompletedSession } from '../test/sessionFixtures'
import { calculateSessionSummary } from './sessionSummary'

test.each([
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 100],
  [5, 0, 0],
  [5, 5, 100],
  [3, 1, 33],
  [3, 2, 67],
  [8, 1, 13],
  [10, 7, 70],
  [20, 19, 95],
])(
  '%s attempts with %s self-reported correct produces %s%% accuracy',
  (attempted, correct, accuracy) => {
    const attempts = Array.from({ length: attempted }, (_value, index) =>
      createAttempt({
        id: `attempt-${index}`,
        questionId: `question-${index}`,
        selfReportedCorrect: index < correct,
      }),
    )
    const summary = calculateSessionSummary(createCompletedSession(attempts))
    expect(summary).toMatchObject({
      attempted,
      correct,
      incorrect: attempted - correct,
      accuracy,
    })
    expect(Number.isFinite(summary.accuracy)).toBe(true)
  },
)

test('accuracy follows self-reports even when selections disagree with arithmetic', () => {
  const attempts = [
    createAttempt({ selectedAnswer: 6, selfReportedCorrect: true }),
    createAttempt({
      id: 'second',
      selectedAnswer: 7,
      selfReportedCorrect: false,
    }),
  ]
  expect(
    calculateSessionSummary(createCompletedSession(attempts)),
  ).toMatchObject({ attempted: 2, correct: 1, incorrect: 1, accuracy: 50 })
})

test('includes only practiced operations and counts completed review questions regardless of result', () => {
  const attempts = [
    createAttempt({
      operation: 'division',
      firstOperand: 8,
      secondOperand: 2,
      correctAnswer: 4,
      selectedAnswer: 3,
      source: 'mistake-review',
      selfReportedCorrect: false,
    }),
    createAttempt({ id: 'second', operation: 'addition' }),
    createAttempt({
      id: 'third',
      operation: 'division',
      firstOperand: 9,
      secondOperand: 3,
      correctAnswer: 3,
      selectedAnswer: 3,
      source: 'mistake-review',
      selfReportedCorrect: true,
    }),
  ]
  const session = createCompletedSession(attempts, {
    operations: ['addition', 'subtraction', 'multiplication', 'division'],
    difficulty: 3,
  })
  expect(calculateSessionSummary(session)).toMatchObject({
    operations: ['division', 'addition'],
    difficulty: 3,
    mistakeReviewCount: 2,
    attempted: 3,
  })
})

test('an empty session has no practiced operations or completed review questions', () => {
  expect(calculateSessionSummary(createCompletedSession())).toEqual({
    attempted: 0,
    correct: 0,
    incorrect: 0,
    accuracy: 0,
    operations: [],
    difficulty: 1,
    mistakeReviewCount: 0,
  })
})

test('derives counts from attempts and leaves the completed snapshot unchanged', () => {
  const attempts = Object.freeze([Object.freeze(createAttempt())])
  const session = Object.freeze(
    createCompletedSession(attempts, {
      attempted: 99,
      correct: 99,
      incorrect: 0,
    }),
  )
  const summary = calculateSessionSummary(session)
  expect(summary).toMatchObject({
    attempted: 1,
    correct: 1,
    incorrect: 0,
    accuracy: 100,
  })
  expect(session.completedAt).toBe('2026-10-20T12:05:00.000Z')
  expect(session.attempts).toBe(attempts)
})
