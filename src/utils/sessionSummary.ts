import type { PracticeSessionState, SessionSummary } from '../types/session'

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
    accuracy: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
    operations: [
      ...new Set(session.attempts.map((attempt) => attempt.operation)),
    ],
    difficulty: session.difficulty,
    mistakeReviewCount: session.attempts.filter(
      (attempt) => attempt.source === 'mistake-review',
    ).length,
  }
}
