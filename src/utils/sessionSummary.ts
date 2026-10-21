import type { PracticeSessionState, SessionSummary } from '../types/session'
import { calculateAccuracy } from './statistics'

/** Summarizes recorded attempts; unfinished cards and merely enabled operations do not count. */
export function calculateSessionSummary(
  session: Pick<PracticeSessionState, 'attempts' | 'difficulty'>,
): SessionSummary {
  const attempted = session.attempts.length
  const correct = session.attempts.filter(
    (attempt) => attempt.selfReportedCorrect,
  ).length
  return {
    attempted,
    correct,
    incorrect: attempted - correct,
    accuracy: Math.round(calculateAccuracy(correct, attempted)),
    operations: [
      ...new Set(session.attempts.map((attempt) => attempt.operation)),
    ],
    difficulty: session.difficulty,
    mistakeReviewCount: session.attempts.filter(
      (attempt) => attempt.source === 'mistake-review',
    ).length,
  }
}
