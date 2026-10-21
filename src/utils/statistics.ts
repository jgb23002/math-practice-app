import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppStatistics, OperationStatistics } from '../types/statistics'

export function calculateAccuracy(correct: number, attempted: number): number {
  return attempted === 0 ? 0 : (correct / attempted) * 100
}

/** Display percentages consistently with session summaries. */
export function formatAccuracy(totals: OperationStatistics): string {
  return `${Math.round(calculateAccuracy(totals.correct, totals.attempted))}%`
}

function emptyTotals(): OperationStatistics {
  return { attempted: 0, correct: 0, incorrect: 0 }
}

export function createEmptyStatistics(): AppStatistics {
  return {
    ...emptyTotals(),
    byOperation: {
      addition: emptyTotals(),
      subtraction: emptyTotals(),
      multiplication: emptyTotals(),
      division: emptyTotals(),
    },
    byDifficulty: {
      1: emptyTotals(),
      2: emptyTotals(),
      3: emptyTotals(),
      4: emptyTotals(),
    },
  }
}

/** Inputs are validated, accepted attempts; the student's marks determine totals. */
export function addAttemptsToStatistics(
  statistics: AppStatistics,
  attempts: readonly PracticeAttempt[],
): AppStatistics {
  const next = structuredClone(statistics)
  for (const attempt of attempts) {
    for (const group of [
      next,
      next.byOperation[attempt.operation],
      next.byDifficulty[attempt.difficulty],
    ]) {
      group.attempted++
      if (attempt.selfReportedCorrect) group.correct++
      else group.incorrect++
    }
  }
  return next
}

export function calculateStatistics(
  attempts: readonly PracticeAttempt[],
): AppStatistics {
  return addAttemptsToStatistics(createEmptyStatistics(), attempts)
}

export function getRecentSessions(
  sessions: readonly PracticeSession[],
): PracticeSession[] {
  return [...sessions].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  )
}
