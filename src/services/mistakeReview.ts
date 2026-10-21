import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { shuffleArray } from '../utils/shuffle'
import type { RandomSource } from '../utils/math'
import { isMistakePattern } from '../utils/storageValidation'

export function getActiveMistakePatterns(
  patterns: readonly MistakePattern[],
): MistakePattern[] {
  return patterns.filter(
    (pattern) => isMistakePattern(pattern) && !pattern.mastered,
  )
}

export function getReviewPatterns(
  patterns: readonly MistakePattern[],
  plan: {
    operations: readonly MathOperation[]
    difficulty: DifficultyLevel | null
  },
): MistakePattern[] {
  return getActiveMistakePatterns(patterns).filter(
    (pattern) =>
      pattern.difficulty === plan.difficulty &&
      plan.operations.includes(pattern.operation),
  )
}

/** More misses, more recent misses, and less review success each raise priority. */
export function mistakePriority(
  pattern: MistakePattern,
  now = Date.now(),
): number {
  const ageDays =
    Math.max(0, now - Date.parse(pattern.lastIncorrectAt)) / 86_400_000
  return (
    2 * Math.log2(pattern.incorrectCount + 1) +
    3 / (1 + ageDays / 7) +
    3 / (1 + pattern.similarCorrectCount)
  )
}

/** Shuffle before stable sorting so patterns in the same score band vary fairly. */
export function prioritizeMistakePatterns(
  patterns: readonly MistakePattern[],
  {
    now = Date.now(),
    random = Math.random,
  }: { now?: number; random?: RandomSource } = {},
): MistakePattern[] {
  if (!Number.isFinite(now))
    throw new RangeError('Review priority needs a finite timestamp.')
  return shuffleArray(getActiveMistakePatterns(patterns), random)
    .map((pattern) => ({
      pattern,
      band: Math.floor(mistakePriority(pattern, now)),
    }))
    .sort((left, right) => right.band - left.band)
    .map(({ pattern }) => pattern)
}
