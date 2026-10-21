import type { DifficultyLevel, MathOperation } from './question'
import type { MistakePattern } from './mistake'

export interface OperationStatistics {
  attempted: number
  correct: number
  incorrect: number
}

export interface AppStatistics {
  attempted: number
  correct: number
  incorrect: number
  byOperation: Record<MathOperation, OperationStatistics>
  byDifficulty: Record<DifficultyLevel, OperationStatistics>
}

export interface RankedMistakePattern {
  pattern: MistakePattern
  /** Competition ranking: equal incorrect counts share a rank (1, 1, 3). */
  rank: number
}

/** Derived from saved patterns and attempts; not a second persisted cache. */
export interface MistakeStatistics {
  activePatterns: RankedMistakePattern[]
  masteredPatterns: RankedMistakePattern[]
  reviewAttempted: number
  reviewCorrect: number
  incorrectByOperation: Record<MathOperation, number>
  mostMissedOperations: MathOperation[]
  mostMissedCount: number
}
