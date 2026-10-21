import { expect, test } from 'vitest'
import {
  recoveryFixture,
  recoverySnapshot,
  reportRecoveryAnswer,
} from '../test/recoveryFixtures'
import { createEmptyStatistics } from './statistics'
import {
  isActiveSessionState,
  isSessionRecoverySnapshot,
} from './sessionRecoveryValidation'

test.each([5, 10, 20, 'continuous'] as const)(
  'validates untouched, selected-zero, revealed and progressed %s sessions',
  (length) => {
    const { session, dependencies } = recoveryFixture(length)
    for (const state of [
      session,
      { ...session, selectedAnswer: 0 },
      { ...session, selectedAnswer: 0, isAnswerRevealed: true },
      reportRecoveryAnswer(session, dependencies),
    ]) {
      expect(isActiveSessionState(state)).toBe(true)
      expect(
        isSessionRecoverySnapshot(
          JSON.parse(JSON.stringify(recoverySnapshot(state))),
        ),
      ).toBe(true)
    }
  },
)

test.each([
  ['inactive', { isActive: false }],
  ['completion timestamp', { completedAt: '2026-10-21T12:01:00.000Z' }],
  ['wrong index', { currentQuestionIndex: 1 }],
  ['unrecorded total', { attempted: 1, correct: 1 }],
  ['unselected reveal', { isAnswerRevealed: true }],
  ['answer not offered', { selectedAnswer: 100 }],
  ['fractional selection', { selectedAnswer: 0.5 }],
  ['string selection', { selectedAnswer: '0' }],
  ['nonboolean reveal', { isAnswerRevealed: 'true' }],
  ['duplicate queue', { reviewQueue: ['one', 'one'] }],
  ['empty queue id', { reviewQueue: [''] }],
  ['unexplained missing card', { currentQuestion: null }],
  ['error alongside a card', { questionError: 'Try again' }],
  ['invalid plan', { operations: [] }],
] as const)('rejects malformed runtime: %s', (_label, patch) => {
  expect(isActiveSessionState({ ...recoveryFixture().session, ...patch })).toBe(
    false,
  )
})

test.each([
  { choices: [0, 0, 1, 2] },
  { choices: [1, 2, 3, 4] },
  { id: '' },
  { source: 'mistake-review', mistakePatternId: 'parent' },
  { operation: 'division', secondOperand: 0 },
  { correctAnswer: 0.5 },
  {
    operation: 'subtraction',
    firstOperand: 0,
    secondOperand: 1,
    correctAnswer: -1,
  },
  { difficulty: 4 },
  { displayText: 'Not arithmetic' },
])('rejects malformed current question %j', (patch) => {
  const { session } = recoveryFixture()
  expect(
    isActiveSessionState({
      ...session,
      currentQuestion: { ...session.currentQuestion, ...patch },
    }),
  ).toBe(false)
})

test('restores a generation-error state without manufacturing an attempt', () => {
  const { session } = recoveryFixture()
  expect(
    isSessionRecoverySnapshot(
      recoverySnapshot({
        ...session,
        currentQuestion: null,
        questionError: 'Try another card.',
      }),
    ),
  ).toBe(true)
})

test('rejects replayed cards, inconsistent attempts and previous-card metadata', () => {
  const { session, dependencies } = recoveryFixture()
  const next = reportRecoveryAnswer(session, dependencies)
  for (const patch of [
    { currentQuestion: session.currentQuestion },
    {
      attempts: [...next.attempts, next.attempts[0]],
      attempted: 2,
      incorrect: 2,
      currentQuestionIndex: 2,
    },
    { attempts: [{ ...next.attempts[0], sessionId: 'other' }] },
    {
      attempts: [
        { ...next.attempts[0], attemptedAt: '2026-10-20T12:00:00.000Z' },
      ],
    },
    { attempts: [{ ...next.attempts[0], source: 'mistake-review' }] },
    { previousQuestion: { ...session.currentQuestion, id: 'other' } },
    { correct: 1, incorrect: 0 },
  ])
    expect(isActiveSessionState({ ...next, ...patch })).toBe(false)
})

test('requires a consistent envelope, durable ledger and cached totals', () => {
  const { session, dependencies } = recoveryFixture()
  const snapshot = recoverySnapshot(reportRecoveryAnswer(session, dependencies))
  expect(isSessionRecoverySnapshot(snapshot)).toBe(true)
  for (const mutate of [
    (copy: typeof snapshot) => {
      copy.version = 2 as 1
    },
    (copy: typeof snapshot) => {
      copy.progress.sessions = []
    },
    (copy: typeof snapshot) => {
      copy.progress.sessions[0].attempted = 0
      copy.progress.sessions[0].incorrect = 0
    },
    (copy: typeof snapshot) => {
      copy.progress.attempts[0].selectedAnswer = 3
    },
    (copy: typeof snapshot) => {
      copy.progress.statistics = createEmptyStatistics()
    },
  ]) {
    const copy: typeof snapshot = JSON.parse(JSON.stringify(snapshot))
    mutate(copy)
    expect(isSessionRecoverySnapshot(copy)).toBe(false)
  }
  expect(isSessionRecoverySnapshot({ ...snapshot, session: null })).toBe(true)
  expect(isSessionRecoverySnapshot(null)).toBe(false)
})
