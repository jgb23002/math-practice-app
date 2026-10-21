import type { PracticeAttempt, PracticeSessionState } from '../types/session'

export function createAttempt(
  overrides: Partial<PracticeAttempt> = {},
): PracticeAttempt {
  return {
    id: 'attempt-one',
    sessionId: 'session-one',
    questionId: 'question-one',
    operation: 'addition',
    firstOperand: 3,
    secondOperand: 4,
    correctAnswer: 7,
    selectedAnswer: 6,
    selfReportedCorrect: true,
    difficulty: 1,
    source: 'regular',
    attemptedAt: '2026-10-20T12:01:00.000Z',
    ...overrides,
  }
}

export function createCompletedSession(
  attempts: readonly PracticeAttempt[] = [],
  overrides: Partial<PracticeSessionState> = {},
): PracticeSessionState {
  const correct = attempts.filter(
    (attempt) => attempt.selfReportedCorrect,
  ).length
  return {
    id: 'session-one',
    startedAt: '2026-10-20T12:00:00.000Z',
    completedAt: '2026-10-20T12:05:00.000Z',
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 5,
    attempted: attempts.length,
    correct,
    incorrect: attempts.length - correct,
    currentQuestionIndex: attempts.length,
    isActive: false,
    currentQuestion: null,
    previousQuestion: null,
    selectedAnswer: null,
    isAnswerRevealed: false,
    attempts,
    questionError: null,
    ...overrides,
  }
}
