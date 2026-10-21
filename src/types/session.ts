import type {
  DifficultyLevel,
  MathOperation,
  Question,
  QuestionSource,
} from './question'
import type { PracticeSessionLength } from './practiceConfiguration'

export type SessionLength = number | 'continuous'

export interface PracticeAttempt {
  id: string
  questionId: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  selectedAnswer: number
  /** Statistics use the child's self-reported result. */
  selfReportedCorrect: boolean
  difficulty: DifficultyLevel
  source: QuestionSource
  attemptedAt: string
  sessionId: string
}

export interface PracticeSession {
  id: string
  startedAt: string
  completedAt?: string
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  attempted: number
  correct: number
  incorrect: number
}

export interface QuestionResult {
  questionId: string
  selectedAnswer: number
  selfReportedCorrect: boolean
}

/** In-memory session state. The index is the zero-based next/current card position. */
export interface PracticeSessionState extends PracticeSession {
  sessionLength: PracticeSessionLength
  currentQuestionIndex: number
  isActive: boolean
  currentQuestion: Question | null
  previousQuestion: Question | null
  selectedAnswer: number | null
  isAnswerRevealed: boolean
  attempts: readonly PracticeAttempt[]
  questionError: string | null
}

export type PracticeSessionAction =
  | { type: 'select'; sessionId: string; questionId: string; answer: number }
  | { type: 'reveal'; sessionId: string; questionId: string; answer: number }
  | { type: 'report'; sessionId: string; result: QuestionResult }
  | { type: 'retry'; sessionId: string }
  | { type: 'end'; sessionId: string }
