import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'
import { DEFAULT_MASTERY_THRESHOLD } from '../config/storage'
import { createUniqueId } from '../utils/ids'
import { mistakePatternKey } from '../utils/mistakePattern'
import { isMistakePattern } from '../utils/storageValidation'

/** Apply newly accepted attempts only; the persisted attempt ledger gates replays. */
export function recordMistakes(
  patterns: MistakePattern[],
  attempts: readonly PracticeAttempt[],
  masteryThreshold = DEFAULT_MASTERY_THRESHOLD,
): MistakePattern[] {
  if (!Number.isSafeInteger(masteryThreshold) || masteryThreshold < 1)
    throw new RangeError('Mastery threshold must be a positive safe integer.')
  const next = [...patterns]
  const indices = new Map(
    next.map((pattern, index) => [mistakePatternKey(pattern), index]),
  )
  const patternIds = new Map(next.map((pattern, index) => [pattern.id, index]))
  for (const attempt of attempts) {
    if (attempt.source === 'mistake-review') {
      const index = patternIds.get(attempt.mistakePatternId ?? '')
      // Legacy/unattributed review history cannot safely update a pattern.
      if (index === undefined) continue
      const previous = next[index]
      const similarCorrectCount = Math.min(
        Number.MAX_SAFE_INTEGER,
        previous.similarCorrectCount + 1,
      )
      next[index] = attempt.selfReportedCorrect
        ? {
            ...previous,
            similarCorrectCount,
            mastered:
              previous.mastered || similarCorrectCount >= masteryThreshold,
          }
        : {
            ...previous,
            incorrectCount: Math.min(
              Number.MAX_SAFE_INTEGER,
              previous.incorrectCount + 1,
            ),
            lastIncorrectAt: attempt.attemptedAt,
            similarCorrectCount: 0,
            mastered: false,
          }
      continue
    }
    if (attempt.selfReportedCorrect) continue
    const key = mistakePatternKey(attempt)
    const index = indices.get(key)
    if (index !== undefined) {
      const previous = next[index]
      next[index] = {
        ...previous,
        // Saturate an already maximal persisted counter instead of overflowing.
        incorrectCount: Math.min(
          Number.MAX_SAFE_INTEGER,
          previous.incorrectCount + 1,
        ),
        lastIncorrectAt: attempt.attemptedAt,
        similarCorrectCount: 0,
        mastered: false,
      }
    } else {
      indices.set(key, next.length)
      const id = createUniqueId()
      patternIds.set(id, next.length)
      next.push({
        id,
        operation: attempt.operation,
        firstOperand: attempt.firstOperand,
        secondOperand: attempt.secondOperand,
        correctAnswer: attempt.correctAnswer,
        difficulty: attempt.difficulty,
        lastIncorrectAt: attempt.attemptedAt,
        incorrectCount: 1,
        similarCorrectCount: 0,
        mastered: false,
      })
    }
  }
  return next
}

/** Salvage readable records without discarding an entire category. */
export function recoverMistakePatterns(values: readonly unknown[]) {
  const patterns: MistakePattern[] = []
  const indices = new Map<string, number>()
  const idOwners = new Map<string, string>()
  let recovered = false
  for (const value of values) {
    if (!isMistakePattern(value)) {
      recovered = true
      continue
    }
    const key = mistakePatternKey(value)
    const owner = idOwners.get(value.id)
    if (owner !== undefined && owner !== key) {
      recovered = true
      continue
    }
    idOwners.set(value.id, key)
    const index = indices.get(key)
    if (index === undefined) {
      indices.set(key, patterns.length)
      patterns.push(value)
    } else {
      recovered = true
      const previous = patterns[index]
      const latest =
        value.lastIncorrectAt > previous.lastIncorrectAt ? value : previous
      // Duplicate snapshots can overlap. Keep the largest count, rather than
      // summing and inventing attempts; preserve the first stable pattern ID.
      patterns[index] = {
        ...latest,
        id: previous.id,
        incorrectCount: Math.max(previous.incorrectCount, value.incorrectCount),
      }
    }
  }
  return { patterns, recovered }
}
