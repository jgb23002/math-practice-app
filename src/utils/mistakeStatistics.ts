import { operationOptions } from '../config/practice'
import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'
import type {
  MistakeStatistics,
  RankedMistakePattern,
} from '../types/statistics'

/** Equal miss counts share a rank; secondary keys only stabilize display order. */
export function rankMistakePatterns(
  patterns: readonly MistakePattern[],
): RankedMistakePattern[] {
  const order = (pattern: MistakePattern) =>
    operationOptions.findIndex((option) => option.value === pattern.operation)
  const sorted = [...patterns].sort(
    (left, right) =>
      right.incorrectCount - left.incorrectCount ||
      Date.parse(right.lastIncorrectAt) - Date.parse(left.lastIncorrectAt) ||
      order(left) - order(right) ||
      left.firstOperand - right.firstOperand ||
      left.secondOperand - right.secondOperand ||
      left.difficulty - right.difficulty ||
      left.id.localeCompare(right.id),
  )
  let rank = 0
  return sorted.map((pattern, index) => {
    if (
      index === 0 ||
      pattern.incorrectCount !== sorted[index - 1].incorrectCount
    )
      rank = index + 1
    return { pattern, rank }
  })
}

/** Inputs have been validated at storage/session boundaries. Results use self-reports. */
export function calculateMistakeStatistics(
  patterns: readonly MistakePattern[],
  attempts: readonly PracticeAttempt[],
): MistakeStatistics {
  const incorrectByOperation = {
    addition: 0,
    subtraction: 0,
    multiplication: 0,
    division: 0,
  }
  for (const pattern of patterns)
    incorrectByOperation[pattern.operation] += pattern.incorrectCount
  const mostMissedCount = Math.max(...Object.values(incorrectByOperation))
  let reviewAttempted = 0
  let reviewCorrect = 0
  for (const attempt of attempts) {
    if (attempt.source !== 'mistake-review') continue
    reviewAttempted++
    if (attempt.selfReportedCorrect) reviewCorrect++
  }
  return {
    activePatterns: rankMistakePatterns(
      patterns.filter((pattern) => !pattern.mastered),
    ),
    masteredPatterns: rankMistakePatterns(
      patterns.filter((pattern) => pattern.mastered),
    ),
    reviewAttempted,
    reviewCorrect,
    incorrectByOperation,
    mostMissedCount,
    mostMissedOperations:
      mostMissedCount === 0
        ? []
        : operationOptions
            .filter(
              (option) =>
                incorrectByOperation[option.value] === mostMissedCount,
            )
            .map((option) => option.value),
  }
}
