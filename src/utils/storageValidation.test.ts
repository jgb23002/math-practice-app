import { expect, test } from 'vitest'
import { createDefaultSettings } from '../config/storage'
import { createEmptyStatistics } from '../services/progressPersistence'
import { createAttempt, createCompletedSession } from '../test/sessionFixtures'
import {
  isAppSettings,
  isAppStatistics,
  isAttemptHistory,
  isPracticeAttempt,
  isPracticeSession,
  isSessionHistory,
} from './storageValidation'

test('accepts current settings, attempts, session metadata, and statistics', () => {
  expect(isAppSettings(createDefaultSettings())).toBe(true)
  expect(isPracticeAttempt(createAttempt())).toBe(true)
  expect(
    isPracticeAttempt(
      createAttempt({
        source: 'mistake-review',
        selectedAnswer: 0,
        selfReportedCorrect: false,
      }),
    ),
  ).toBe(true)
  expect(isPracticeSession(createCompletedSession())).toBe(true)
  expect(isAppStatistics(createEmptyStatistics())).toBe(true)
})

test.each([
  ['soundEnabled', 'yes'],
  ['animationsEnabled', 1],
  ['showExplanations', null],
  ['feedbackEnabled', 'false'],
  ['feedbackEnabled', null],
  ['feedbackEnabled', 0],
  ['defaultSessionLength', 0],
  ['defaultSessionLength', 15],
  ['defaultDifficulty', 5],
  ['defaultOperations', ['power']],
  ['defaultOperations', ['addition', 'addition']],
  ['defaultOperations', Array(1)],
  ['masteryThreshold', 0],
  ['masteryThreshold', 1.5],
])('rejects invalid setting %s = %j', (key, value) => {
  expect(isAppSettings({ ...createDefaultSettings(), [key]: value })).toBe(
    false,
  )
})

test.each([
  ['id', ''],
  ['sessionId', null],
  ['questionId', 12],
  ['attemptedAt', 'yesterday'],
  ['attemptedAt', '2026-02-30T00:00:00.000Z'],
  ['selectedAnswer', -1],
  ['selectedAnswer', 0.5],
  ['selectedAnswer', Infinity],
  ['selfReportedCorrect', 'true'],
  ['difficulty', 5],
  ['source', 'other'],
  ['correctAnswer', 8],
  ['firstOperand', 1000],
  ['secondOperand', -1],
])('rejects malformed attempt %s = %j', (key, value) => {
  expect(isPracticeAttempt({ ...createAttempt(), [key]: value })).toBe(false)
})

test('rejects zero division, fractional division, negative subtraction, and duplicate records', () => {
  for (const attempt of [
    createAttempt({
      operation: 'division',
      firstOperand: 8,
      secondOperand: 0,
      correctAnswer: 0,
    }),
    createAttempt({
      operation: 'division',
      firstOperand: 7,
      secondOperand: 2,
      correctAnswer: 3.5,
    }),
    createAttempt({
      operation: 'subtraction',
      firstOperand: 3,
      secondOperand: 4,
      correctAnswer: -1,
    }),
  ])
    expect(isPracticeAttempt(attempt)).toBe(false)
  expect(isAttemptHistory([createAttempt(), createAttempt()])).toBe(false)
  expect(
    isAttemptHistory([createAttempt(), createAttempt({ id: 'different' })]),
  ).toBe(false)
  expect(isAttemptHistory(Array(1))).toBe(false)
  expect(
    isSessionHistory([createCompletedSession(), createCompletedSession()]),
  ).toBe(false)
})

test.each([
  ['attempted', -1],
  ['attempted', 6],
  ['correct', 1],
  ['incorrect', NaN],
  ['operations', []],
  ['difficulty', 0],
  ['sessionLength', 15],
  ['startedAt', 'bad'],
  ['completedAt', '2020-01-01T00:00:00.000Z'],
])('rejects malformed session %s = %j', (key, value) => {
  expect(isPracticeSession({ ...createCompletedSession(), [key]: value })).toBe(
    false,
  )
})

test('rejects incomplete, inconsistent, fractional, and unsafe statistics', () => {
  const initial = createEmptyStatistics()
  for (const value of [
    null,
    [],
    {},
    { ...initial, byOperation: {} },
    { ...initial, byDifficulty: null },
    { ...initial, attempted: 1, correct: 1 },
    { ...initial, attempted: 0.5 },
    { ...initial, correct: Number.MAX_SAFE_INTEGER + 1 },
    {
      ...initial,
      byDifficulty: {
        ...initial.byDifficulty,
        1: { attempted: 0, correct: 1, incorrect: 0 },
      },
    },
  ])
    expect(isAppStatistics(value)).toBe(false)
})
