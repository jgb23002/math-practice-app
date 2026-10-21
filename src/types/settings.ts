import type { DifficultyLevel, MathOperation } from './question'
import type { PracticeSessionLength } from './practiceConfiguration'

export interface AppSettings {
  soundEnabled: boolean
  animationsEnabled: boolean
  showExplanations: boolean
  /** Missing in older saves; encouraging messages default to enabled. */
  feedbackEnabled?: boolean
  defaultSessionLength: PracticeSessionLength
  defaultDifficulty: DifficultyLevel
  defaultOperations: MathOperation[]
  /** Number of correct similar answers needed for mastery; intended default: 3. */
  masteryThreshold: number
}
