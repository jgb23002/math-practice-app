import type { PracticeSessionLength } from '../types/practiceConfiguration'
import type { DifficultyLevel, MathOperation } from '../types/question'

export const operationOptions = [
  { value: 'addition', label: 'Addition', symbol: '+', color: 'blue' },
  { value: 'subtraction', label: 'Subtraction', symbol: '−', color: 'peach' },
  {
    value: 'multiplication',
    label: 'Multiplication',
    symbol: '×',
    color: 'green',
  },
  { value: 'division', label: 'Division', symbol: '÷', color: 'yellow' },
] as const satisfies readonly {
  value: MathOperation
  label: string
  symbol: string
  color: string
}[]

export const difficultyOptions = [
  {
    value: 1,
    label: 'Level 1: Beginner',
    description: 'A gentle start with small numbers and friendly math facts.',
  },
  {
    value: 2,
    label: 'Level 2: Easy',
    description: 'Explore bigger numbers and familiar times tables.',
  },
  {
    value: 3,
    label: 'Level 3: Intermediate',
    description: 'Try carrying, borrowing, and new number facts.',
  },
  {
    value: 4,
    label: 'Level 4: Advanced',
    description: 'Stretch your skills with larger numbers and trickier facts.',
  },
] as const satisfies readonly {
  value: DifficultyLevel
  label: string
  description: string
}[]

export const sessionLengthOptions = [
  { value: 5, label: '5 questions', description: 'A quick warm-up' },
  { value: 10, label: '10 questions', description: 'A little time to grow' },
  { value: 20, label: '20 questions', description: 'A bigger adventure' },
  {
    value: 'continuous',
    label: 'Continuous practice',
    description: 'Keep going at your own pace',
  },
] as const satisfies readonly {
  value: PracticeSessionLength
  label: string
  description: string
}[]
