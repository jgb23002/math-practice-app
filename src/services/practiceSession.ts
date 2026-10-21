import type { Question } from '../types/question'
import type { MistakePattern } from '../types/mistake'
import type {
  PracticeAttempt,
  PracticeSessionAction,
  PracticeSessionState,
} from '../types/session'
import { createUniqueId } from '../utils/ids'
import { isValidPracticeConfiguration } from '../utils/practiceConfiguration'
import { isValidQuestion } from '../utils/validation'
import { generateQuestion } from './questionGenerator'
import { generateSimilarQuestion } from './similarQuestionGenerator'
import { getReviewPatterns, prioritizeMistakePatterns } from './mistakeReview'
import { recordMistakes } from './mistakeTracking'
import type { RandomSource } from '../utils/math'

export const MAX_REPEAT_ATTEMPTS = 8

interface SessionDependencies {
  generate?: typeof generateQuestion
  generateSimilar?: typeof generateSimilarQuestion
  mistakePatterns?: readonly MistakePattern[]
  masteryThreshold?: number
  random?: RandomSource
  createId?: () => string
  now?: () => string
}

function withCard(
  session: PracticeSessionState,
  candidate: Question,
  createId: () => string,
): PracticeSessionState {
  const usedIds = new Set(session.attempts.map((attempt) => attempt.questionId))
  const id = usedIds.has(candidate.id) ? createId() : candidate.id
  if (!id.trim() || usedIds.has(id))
    throw new Error('A fresh question ID is required.')
  return {
    ...session,
    currentQuestion: { ...candidate, id, choices: [...candidate.choices] },
    questionError: null,
  }
}

function withReviewQuestion(
  session: PracticeSessionState,
  dependencies: SessionDependencies,
): PracticeSessionState {
  const patterns = getReviewPatterns(
    dependencies.mistakePatterns ?? [],
    session,
  )
  if (patterns.length === 0) return complete(session, dependencies)
  const byId = new Map(patterns.map((pattern) => [pattern.id, pattern]))
  let queue = (session.reviewQueue ?? []).filter((id) => byId.has(id))
  if (queue.length === 0) {
    queue = prioritizeMistakePatterns(patterns, {
      now: Date.parse(
        session.attempts.at(-1)?.attemptedAt ?? session.startedAt,
      ),
      random: dependencies.random,
    }).map((pattern) => pattern.id)
    if (
      queue.length > 1 &&
      queue[0] === session.previousQuestion?.mistakePatternId
    )
      queue.push(queue.shift()!)
  }
  const pattern = byId.get(queue[0])!
  const question = (dependencies.generateSimilar ?? generateSimilarQuestion)(
    pattern,
    {
      random: dependencies.random,
      createId: dependencies.createId,
      allowedOperations: session.operations,
      recentQuestions: session.attempts.slice(-5),
    },
  )
  if (
    !isValidQuestion(question) ||
    question.source !== 'mistake-review' ||
    question.mistakePatternId !== pattern.id ||
    question.difficulty !== session.difficulty ||
    !session.operations.includes(question.operation)
  )
    throw new Error(
      'Review question must match its original pattern and session plan.',
    )
  return {
    ...withCard(session, question, dependencies.createId ?? createUniqueId),
    reviewQueue: queue.slice(1),
  }
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
    if (session.mode === 'mistake-review')
      return withReviewQuestion(session, dependencies)
    let candidate: Question | null = null
    for (let attempt = 0; attempt < MAX_REPEAT_ATTEMPTS; attempt++) {
      const question = generate(session.operations, session.difficulty)
      if (
        !isValidQuestion(question) ||
        question.source !== 'regular' ||
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
    return withCard(session, candidate, createId)
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
  if (
    configuration.mode === 'mistake-review' &&
    getReviewPatterns(dependencies.mistakePatterns ?? [], configuration)
      .length === 0
  )
    throw new RangeError('No active mistake patterns match this practice plan.')
  const session: PracticeSessionState = {
    ...(configuration.mode ? { mode: configuration.mode } : {}),
    ...(configuration.mode === 'mistake-review' ? { reviewQueue: [] } : {}),
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
  // Completion is a latch: late reports/end events cannot replace its timestamp
  // or generate another question once the session is inactive.
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
    ...(question.source === 'mistake-review'
      ? { mistakePatternId: question.mistakePatternId }
      : {}),
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
  // Generate against projected mastery so the very next card cannot target a
  // pattern mastered by this report. Persistence applies this delta once.
  return withNextQuestion(
    next,
    session.mode === 'mistake-review'
      ? {
          ...dependencies,
          mistakePatterns: recordMistakes(
            [...(dependencies.mistakePatterns ?? [])],
            [attempt],
            dependencies.masteryThreshold,
          ),
        }
      : dependencies,
  )
}
