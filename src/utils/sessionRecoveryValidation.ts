import type {
  StoredProgress,
  SessionRecoverySnapshot,
} from '../types/persistence'
import type { PracticeAttempt, PracticeSessionState } from '../types/session'
import {
  isAppSettings,
  isAppStatistics,
  isAttemptHistory,
  isMistakePatternHistory,
  isPracticeSession,
  isSessionHistory,
} from './storageValidation'
import { isValidQuestion } from './validation'
import { calculateStatistics } from './statistics'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function sameRecordedAttempt(
  left: PracticeAttempt,
  right: PracticeAttempt,
) {
  const keys: (keyof PracticeAttempt)[] = [
    'id',
    'questionId',
    'sessionId',
    'operation',
    'firstOperand',
    'secondOperand',
    'correctAnswer',
    'selectedAnswer',
    'selfReportedCorrect',
    'difficulty',
    'source',
    'mistakePatternId',
    'attemptedAt',
  ]
  return keys.every((key) => left[key] === right[key])
}

function validProgress(value: unknown): value is StoredProgress {
  if (!(
    record(value) &&
    isAppSettings(value.settings) &&
    isSessionHistory(value.sessions) &&
    isAttemptHistory(value.attempts) &&
    isMistakePatternHistory(value.mistakePatterns) &&
    isAppStatistics(value.statistics)
  ))
    return false
  const statistics = value.statistics
  const minimum = calculateStatistics(value.attempts)
  const groups = [
    [statistics, minimum],
    ...Object.keys(minimum.byOperation).map((key) => [
      statistics.byOperation[key as keyof typeof minimum.byOperation],
      minimum.byOperation[key as keyof typeof minimum.byOperation],
    ]),
    ...([1, 2, 3, 4] as const).map((key) => [
      statistics.byDifficulty[key],
      minimum.byDifficulty[key],
    ]),
  ]
  // Larger aggregates can include older detail that was independently lost.
  return groups.every(([stored, computed]) =>
    (['attempted', 'correct', 'incorrect'] as const).every(
      (key) => stored[key] >= computed[key],
    ),
  )
}

export function isActiveSessionState(
  value: unknown,
): value is PracticeSessionState {
  if (
    !record(value) ||
    !isPracticeSession(value) ||
    value.isActive !== true ||
    value.completedAt !== undefined ||
    !isAttemptHistory(value.attempts)
  )
    return false
  const session = value as unknown as PracticeSessionState
  if (
    session.attempted !== session.attempts.length ||
    session.currentQuestionIndex !== session.attempted ||
    session.correct !==
      session.attempts.filter((a) => a.selfReportedCorrect).length ||
    (session.sessionLength !== 'continuous' &&
      session.attempted >= session.sessionLength) ||
    typeof session.isAnswerRevealed !== 'boolean' ||
    (session.questionError !== null &&
      (typeof session.questionError !== 'string' ||
        !session.questionError.trim())) ||
    (session.reviewQueue !== undefined &&
      (!Array.isArray(session.reviewQueue) ||
        !session.reviewQueue.every(
          (id) => typeof id === 'string' && id.trim(),
        ) ||
        new Set(session.reviewQueue).size !== session.reviewQueue.length))
  )
    return false
  const source =
    session.mode === 'mistake-review' ? 'mistake-review' : 'regular'
  if (
    !session.attempts.every(
      (a) =>
        a.sessionId === session.id &&
        a.attemptedAt >= session.startedAt &&
        a.difficulty === session.difficulty &&
        session.operations.includes(a.operation) &&
        a.source === source &&
        (source !== 'mistake-review' || typeof a.mistakePatternId === 'string'),
    )
  )
    return false
  if (session.previousQuestion !== null) {
    const previous = session.previousQuestion,
      last = session.attempts.at(-1)
    if (
      !isValidQuestion(previous) ||
      !last ||
      previous.id !== last.questionId ||
      previous.operation !== last.operation ||
      previous.firstOperand !== last.firstOperand ||
      previous.secondOperand !== last.secondOperand ||
      previous.correctAnswer !== last.correctAnswer ||
      previous.difficulty !== last.difficulty ||
      previous.source !== last.source ||
      previous.mistakePatternId !== last.mistakePatternId
    )
      return false
  }
  const question = session.currentQuestion
  if (question === null)
    return (
      session.selectedAnswer === null &&
      !session.isAnswerRevealed &&
      session.questionError !== null
    )
  return (
    isValidQuestion(question) &&
    question.difficulty === session.difficulty &&
    session.operations.includes(question.operation) &&
    question.source === source &&
    !session.attempts.some((a) => a.questionId === question.id) &&
    session.questionError === null &&
    (session.selectedAnswer === null ||
      (typeof session.selectedAnswer === 'number' &&
        question.choices.includes(session.selectedAnswer))) &&
    (!session.isAnswerRevealed || session.selectedAnswer !== null)
  )
}

export function isSessionRecoverySnapshot(
  value: unknown,
): value is SessionRecoverySnapshot {
  if (!record(value) || value.version !== 1 || !validProgress(value.progress))
    return false
  if (value.session === null) return true
  if (!isActiveSessionState(value.session)) return false
  const { session, progress } = value
  const metadata = progress.sessions.find((item) => item.id === session.id)
  const attempts = progress.attempts.filter((a) => a.sessionId === session.id)
  return (
    !!metadata &&
    !metadata.completedAt &&
    metadata.startedAt === session.startedAt &&
    (metadata.mode ?? 'regular') === (session.mode ?? 'regular') &&
    metadata.difficulty === session.difficulty &&
    metadata.sessionLength === session.sessionLength &&
    metadata.operations.join(',') === session.operations.join(',') &&
    metadata.attempted === session.attempted &&
    metadata.correct === session.correct &&
    metadata.incorrect === session.incorrect &&
    attempts.length === session.attempts.length &&
    session.attempts.every((a) =>
      attempts.some((b) => sameRecordedAttempt(a, b)),
    ) &&
    (session.currentQuestion?.source !== 'mistake-review' ||
      progress.mistakePatterns.some(
        (pattern) =>
          pattern.id === session.currentQuestion!.mistakePatternId &&
          pattern.difficulty === session.difficulty &&
          session.operations.includes(pattern.operation) &&
          !pattern.mastered,
      ))
  )
}
