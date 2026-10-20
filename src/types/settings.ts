import type { DifficultyLevel, MathOperation } from './question'
import type { SessionLength } from './session'

export interface AppSettings {
  soundEnabled: boolean
  animationsEnabled: boolean
  showExplanations: boolean
  defaultSessionLength: SessionLength
  defaultDifficulty: DifficultyLevel
  defaultOperations: MathOperation[]
  /** Number of correct similar answers needed for mastery; intended default: 3. */
  masteryThreshold: number
}
