import type {
  DifficultyLevel,
  MathOperation,
  Question,
  QuestionSource,
} from './question'
import type {
  PracticeMode,
  PracticeSessionLength,
} from './practiceConfiguration'

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
  /** Original pattern for review attempts; absent in legacy stored attempts. */
  mistakePatternId?: string
  attemptedAt: string
  sessionId: string
}

export interface PracticeSession {
  mode?: PracticeMode
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

export interface SessionSummary {
  attempted: number
  correct: number
  incorrect: number
  /** Whole percentage, rounded to the nearest integer; zero for no attempts. */
  accuracy: number
  operations: MathOperation[]
  difficulty: DifficultyLevel
  mistakeReviewCount: number
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
  /** Remaining pattern IDs in this review round; never persisted as metadata. */
  reviewQueue?: readonly string[]
}

export type PracticeSessionAction =
  | { type: 'select'; sessionId: string; questionId: string; answer: number }
  | { type: 'reveal'; sessionId: string; questionId: string; answer: number }
  | { type: 'report'; sessionId: string; result: QuestionResult }
  | { type: 'retry'; sessionId: string }
  | { type: 'end'; sessionId: string }
