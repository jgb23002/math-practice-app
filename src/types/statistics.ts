import type { DifficultyLevel, MathOperation } from './question'

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
