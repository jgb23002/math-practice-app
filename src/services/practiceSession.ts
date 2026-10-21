import type { Question } from '../types/question'
import type {
  PracticeAttempt,
  PracticeSessionAction,
  PracticeSessionState,
} from '../types/session'
import { createUniqueId } from '../utils/ids'
import { isValidPracticeConfiguration } from '../utils/practiceConfiguration'
import { isValidQuestion } from '../utils/validation'
import { generateQuestion } from './questionGenerator'

export const MAX_REPEAT_ATTEMPTS = 8

interface SessionDependencies {
  generate?: typeof generateQuestion
  createId?: () => string
  now?: () => string
}

function sameFact(left: Question, right: Question) {
  if (left.operation !== right.operation) return false
  if (
    left.firstOperand === right.firstOperand &&
    left.secondOperand === right.secondOperand
  )
    return true
  return (
    (left.operation === 'addition' || left.operation === 'multiplication') &&
    left.firstOperand === right.secondOperand &&
    left.secondOperand === right.firstOperand
  )
}

function withNextQuestion(
  session: PracticeSessionState,
  dependencies: SessionDependencies,
): PracticeSessionState {
  const generate = dependencies.generate ?? generateQuestion
  const createId = dependencies.createId ?? createUniqueId
  try {
    let candidate: Question | null = null
    for (let attempt = 0; attempt < MAX_REPEAT_ATTEMPTS; attempt++) {
      const question = generate(session.operations, session.difficulty)
      if (
        !isValidQuestion(question) ||
        question.difficulty !== session.difficulty ||
        !session.operations.includes(question.operation)
      )
        throw new Error(
          'Generator returned a question outside the session configuration.',
        )
      candidate = question
      if (
        !session.previousQuestion ||
        !sameFact(question, session.previousQuestion)
      )
        break
    }
    if (!candidate) throw new Error('No valid question was generated.')
    const usedIds = new Set(
      session.attempts.map((attempt) => attempt.questionId),
    )
    const id = usedIds.has(candidate.id) ? createId() : candidate.id
    if (!id.trim() || usedIds.has(id))
      throw new Error('A fresh question ID is required.')
    return {
      ...session,
      currentQuestion: { ...candidate, id, choices: [...candidate.choices] },
      questionError: null,
    }
  } catch {
    return {
      ...session,
      currentQuestion: null,
      questionError: 'That card got a little tangled. Let’s try again!',
    }
  }
}

export function createPracticeSession(
  configuration: unknown,
  dependencies: SessionDependencies = {},
): PracticeSessionState {
  if (!isValidPracticeConfiguration(configuration))
    throw new TypeError('A valid practice configuration is required.')
  const session: PracticeSessionState = {
    id: (dependencies.createId ?? createUniqueId)(),
    startedAt: (dependencies.now ?? (() => new Date().toISOString()))(),
    operations: [...configuration.operations],
    difficulty: configuration.difficulty,
    sessionLength: configuration.sessionLength,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    currentQuestionIndex: 0,
    isActive: true,
    currentQuestion: null,
    previousQuestion: null,
    selectedAnswer: null,
    isAnswerRevealed: false,
    attempts: [],
    questionError: null,
  }
  return withNextQuestion(session, dependencies)
}

function complete(
  session: PracticeSessionState,
  dependencies: SessionDependencies,
): PracticeSessionState {
  return {
    ...session,
    isActive: false,
    completedAt: (dependencies.now ?? (() => new Date().toISOString()))(),
    currentQuestion: null,
    selectedAnswer: null,
    isAnswerRevealed: false,
    questionError: null,
  }
}

/** Only explicit, valid self-reports can append attempts or change totals. */
export function transitionPracticeSession(
  session: PracticeSessionState,
  action: PracticeSessionAction,
  dependencies: SessionDependencies = {},
): PracticeSessionState {
  if (!session.isActive || action.sessionId !== session.id) return session
  if (action.type === 'end') return complete(session, dependencies)
  if (action.type === 'retry')
    return session.currentQuestion === null
      ? withNextQuestion(session, dependencies)
      : session
  const question = session.currentQuestion
  if (!question) return session
  if (action.type === 'select') {
    if (
      action.questionId !== question.id ||
      session.isAnswerRevealed ||
      !question.choices.includes(action.answer)
    )
      return session
    return { ...session, selectedAnswer: action.answer }
  }
  if (action.type === 'reveal') {
    if (
      action.questionId !== question.id ||
      session.selectedAnswer === null ||
      action.answer !== session.selectedAnswer ||
      session.isAnswerRevealed
    )
      return session
    return { ...session, isAnswerRevealed: true }
  }
  const result = action.result
  if (
    !result ||
    typeof result !== 'object' ||
    !session.isAnswerRevealed ||
    session.selectedAnswer === null ||
    result.questionId !== question.id ||
    result.selectedAnswer !== session.selectedAnswer ||
    typeof result.selfReportedCorrect !== 'boolean' ||
    session.attempts.some((attempt) => attempt.questionId === question.id)
  )
    return session
  const attempt: PracticeAttempt = {
    id: (dependencies.createId ?? createUniqueId)(),
    sessionId: session.id,
    questionId: question.id,
    operation: question.operation,
    firstOperand: question.firstOperand,
    secondOperand: question.secondOperand,
    correctAnswer: question.correctAnswer,
    selectedAnswer: session.selectedAnswer,
    selfReportedCorrect: result.selfReportedCorrect,
    difficulty: question.difficulty,
    source: question.source,
    attemptedAt: (dependencies.now ?? (() => new Date().toISOString()))(),
  }
  const next: PracticeSessionState = {
    ...session,
    attempted: session.attempted + 1,
    correct: session.correct + Number(result.selfReportedCorrect),
    incorrect: session.incorrect + Number(!result.selfReportedCorrect),
    attempts: [...session.attempts, attempt],
    currentQuestionIndex: session.currentQuestionIndex + 1,
    previousQuestion: question,
    currentQuestion: null,
    selectedAnswer: null,
    isAnswerRevealed: false,
  }
  if (
    next.sessionLength !== 'continuous' &&
    next.attempted >= next.sessionLength
  )
    return complete(next, dependencies)
  return withNextQuestion(next, dependencies)
}
