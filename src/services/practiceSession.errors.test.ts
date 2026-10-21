import { expect, test, vi } from 'vitest'
import { createQuestion } from '../test/questionFixtures'
import { createMistakePattern } from '../test/mistakeFixtures'
import { isValidQuestion } from '../utils/validation'
import { isSessionRecoverySnapshot } from '../utils/sessionRecoveryValidation'
import {
  createPracticeSession,
  MAX_SESSION_GENERATION_FAILURES,
  QUESTION_ERROR_MESSAGE,
  transitionPracticeSession,
} from './practiceSession'
import {
  completeFallbackQuestion,
  generateFallbackQuestion,
} from './fallbackQuestion'
import { generateFallbackReviewQuestion } from './similarQuestionGenerator'
import { recoverySnapshot } from '../test/recoveryFixtures'
import { generateQuestion } from './questionGenerator'

const operations = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const
const levels = [1, 2, 3, 4] as const
const broken = () => {
  throw new Error('Technical exception: secret stack trace')
}

for (const operation of operations)
  for (const difficulty of levels) {
    test(`${operation} level ${difficulty} retries exactly the failure limit and uses a safe fallback`, () => {
      const generate = vi.fn(broken),
        fallback = vi.fn(generateFallbackQuestion)
      const session = createPracticeSession(
        { operations: [operation], difficulty, sessionLength: 5 },
        { generate, generateFallback: fallback },
      )
      expect(generate).toHaveBeenCalledTimes(MAX_SESSION_GENERATION_FAILURES)
      expect(fallback).toHaveBeenCalledOnce()
      expect(isValidQuestion(session.currentQuestion)).toBe(true)
      expect(session.currentQuestion).toMatchObject({
        operation,
        difficulty,
        source: 'regular',
      })
      expect(session.attempts).toEqual([])
      expect(session.questionError).toBeNull()
      expect(isSessionRecoverySnapshot(recoverySnapshot(session))).toBe(true)
      for (const attempted of [0, 1, 2, 99]) {
        const question = generateFallbackQuestion({
          operations: [operation],
          difficulty,
          attempted,
        })
        expect(isValidQuestion(question), JSON.stringify(question)).toBe(true)
        expect(new Set(question.choices).size).toBe(4)
      }
    })
    test(`review fallback for ${operation} level ${difficulty} retains its original attribution and a related fact`, () => {
      const original = generateFallbackQuestion({
        operations: [operation],
        difficulty,
        attempted: 0,
      })
      const pattern = createMistakePattern({
        operation,
        difficulty,
        firstOperand: original.firstOperand,
        secondOperand: original.secondOperand,
        correctAnswer: original.correctAnswer,
      })
      const generate = vi.fn(broken)
      const session = createPracticeSession(
        {
          mode: 'mistake-review',
          operations: [operation],
          difficulty,
          sessionLength: 5,
        },
        {
          generateSimilar: generate,
          mistakePatterns: [pattern],
          random: () => 0,
        },
      )
      expect(generate).toHaveBeenCalledTimes(MAX_SESSION_GENERATION_FAILURES)
      expect(session.currentQuestion).toMatchObject({
        source: 'mistake-review',
        mistakePatternId: pattern.id,
        difficulty,
        operation,
      })
      expect(isValidQuestion(session.currentQuestion)).toBe(true)
      expect([
        session.currentQuestion!.firstOperand,
        session.currentQuestion!.secondOperand,
      ]).not.toEqual([pattern.firstOperand, pattern.secondOperand])
      expect(
        Math.abs(
          session.currentQuestion!.firstOperand - pattern.firstOperand,
        ) <= 2 || operation === 'division',
      ).toBe(true)
      expect(pattern.incorrectCount).toBe(1)
      expect(pattern.similarCorrectCount).toBe(0)
    })
    test(`review fallback stays valid at zero/minimum and maximum ${operation} level ${difficulty} boundaries`, () => {
      for (const random of [() => 0, () => 1 - Number.EPSILON]) {
        const question = generateQuestion(operation, difficulty, { random })
        const pattern = createMistakePattern({
          operation,
          difficulty,
          firstOperand: question.firstOperand,
          secondOperand: question.secondOperand,
          correctAnswer: question.correctAnswer,
        })
        const fallback = generateFallbackReviewQuestion(pattern, {
          allowedOperations: [operation],
        })
        expect(
          isValidQuestion(fallback),
          JSON.stringify({ pattern, fallback }),
        ).toBe(true)
        expect(fallback).toMatchObject({
          operation,
          difficulty,
          source: 'mistake-review',
          mistakePatternId: pattern.id,
        })
        expect([fallback.firstOperand, fallback.secondOperand]).not.toEqual([
          pattern.firstOperand,
          pattern.secondOperand,
        ])
      }
    })
  }

test.each([
  null,
  {},
  createQuestion({ choices: [7, 7, 8, 9] }),
  createQuestion({ choices: [6, 8, 9, 10] }),
  createQuestion({ choices: [6, 7, -1, 0.5] }),
  createQuestion({ correctAnswer: -1 }),
  createQuestion({ difficulty: 4 }),
  createQuestion({ operation: 'division', secondOperand: 0 }),
  createQuestion({ source: 'mistake-review', mistakePatternId: 'other' }),
])('invalid generator output %j is retried before any card is shown', (bad) => {
  const generate = vi
    .fn()
    .mockReturnValueOnce(bad)
    .mockReturnValue(createQuestion())
  const session = createPracticeSession(
    { operations: ['addition'], difficulty: 1, sessionLength: 5 },
    { generate },
  )
  expect(generate).toHaveBeenCalledTimes(2)
  expect(session.currentQuestion).toEqual(createQuestion())
  expect(session.attempts).toEqual([])
})

test('broken primary and fallback generators stop after bounded work and expose only friendly copy', () => {
  const generate = vi.fn(broken),
    fallback = vi.fn(broken)
  const session = createPracticeSession(
    { operations: ['addition'], difficulty: 1, sessionLength: 5 },
    { generate, generateFallback: fallback },
  )
  expect(generate).toHaveBeenCalledTimes(MAX_SESSION_GENERATION_FAILURES)
  expect(fallback).toHaveBeenCalledOnce()
  expect(session.currentQuestion).toBeNull()
  expect(session.questionError).toBe(QUESTION_ERROR_MESSAGE)
  expect(JSON.stringify(session)).not.toMatch(/Technical|secret|stack trace/)
  expect(isSessionRecoverySnapshot(recoverySnapshot(session))).toBe(true)
  const recovered = transitionPracticeSession(
    session,
    { type: 'retry', sessionId: session.id },
    { generate: () => createQuestion() },
  )
  expect(recovered.id).toBe(session.id)
  expect(recovered.currentQuestion).toEqual(createQuestion())
  expect(recovered.attempted).toBe(0)
})

test('an invalid fallback is rejected as strictly as primary generator output', () => {
  const session = createPracticeSession(
    { operations: ['addition'], difficulty: 1, sessionLength: 5 },
    {
      generate: broken,
      generateFallback: () => createQuestion({ choices: [7, 7, 7, 7] }),
    },
  )
  expect(session.currentQuestion).toBeNull()
  expect(session.questionError).toBe(QUESTION_ERROR_MESSAGE)
})

test('mixed-operation fallbacks rotate among enabled skills and vary repeated facts', () => {
  const questions = Array.from({ length: 8 }, (_, attempted) =>
    generateFallbackQuestion({
      operations: [...operations],
      difficulty: 4,
      attempted,
    }),
  )
  expect(questions.map((q) => q.operation)).toEqual([
    ...operations,
    ...operations,
  ])
  for (let index = 0; index < 4; index++)
    expect(questions[index + 4].firstOperand).not.toBe(
      questions[index].firstOperand,
    )
  expect(new Set(questions.map((q) => q.id)).size).toBe(8)
})

test('deterministic fallback choices handle zero with unique nonnegative integers', () => {
  const question = completeFallbackQuestion({
    ...createQuestion({
      firstOperand: 0,
      secondOperand: 0,
      correctAnswer: 0,
      displayText: '0 + 0 = ?',
    }),
  })
  expect(isValidQuestion(question)).toBe(true)
  expect([...question.choices].sort()).toEqual([0, 1, 2, 3])
})

test('fallback answer order varies across fresh identities without the arithmetic random source', () => {
  const positions = new Set(
    Array.from({ length: 80 }, () => {
      const question = generateFallbackQuestion({
        operations: ['addition'],
        difficulty: 1,
        attempted: 0,
      })
      return question.choices.indexOf(question.correctAnswer)
    }),
  )
  expect([...positions].sort()).toEqual([0, 1, 2, 3])
})

test('review fallback rejects an unrelated plan rather than substituting a regular question', () => {
  const pattern = createMistakePattern()
  expect(() =>
    generateFallbackReviewQuestion(pattern, {
      allowedOperations: ['division'],
    }),
  ).toThrow(/No related fallback/)
})

test('review ordering and card generation recover even if randomness is unavailable', () => {
  const patterns = [
    createMistakePattern(),
    createMistakePattern({ id: 'other', firstOperand: 2, correctAnswer: 6 }),
  ]
  const session = createPracticeSession(
    {
      mode: 'mistake-review',
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    },
    { mistakePatterns: patterns, random: broken },
  )
  expect(isValidQuestion(session.currentQuestion)).toBe(true)
  expect(session.currentQuestion?.source).toBe('mistake-review')
  expect(session.reviewQueue).toHaveLength(1)
})
