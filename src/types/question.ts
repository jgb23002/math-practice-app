export type MathOperation =
  'addition' | 'subtraction' | 'multiplication' | 'division'

export type DifficultyLevel = 1 | 2 | 3 | 4

export type QuestionSource = 'regular' | 'mistake-review'

export interface Question {
  id: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  displayText: string
  correctAnswer: number
  choices: number[]
  difficulty: DifficultyLevel
  source: QuestionSource
  mistakePatternId?: string
}

/** Phase 4 arithmetic data; Phase 5 adds choices to produce a display-ready Question. */
export type ArithmeticQuestion = Omit<Question, 'choices'>
