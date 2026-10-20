import type { DifficultyLevel, MathOperation } from './question'

export type PracticeSessionLength = 5 | 10 | 20 | 'continuous'

/** Validated setup choices, separate from session history and question state. */
export interface PracticeConfiguration {
  readonly operations: readonly [MathOperation, ...MathOperation[]]
  readonly difficulty: DifficultyLevel
  readonly sessionLength: PracticeSessionLength
}
