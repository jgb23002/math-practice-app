import type { DifficultyLevel, MathOperation } from './question'

export type PracticeSessionLength = 5 | 10 | 20 | 'continuous'
export type PracticeMode = 'regular' | 'mistake-review'

/** Validated setup choices, separate from session history and question state. */
export interface PracticeConfiguration {
  /** Omitted by legacy configurations: regular practice. */
  readonly mode?: PracticeMode
  readonly operations: readonly [MathOperation, ...MathOperation[]]
  readonly difficulty: DifficultyLevel
  readonly sessionLength: PracticeSessionLength
}
