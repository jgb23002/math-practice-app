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
import {
  generateSimilarQuestion,
  generateFallbackReviewQuestion,
} from './similarQuestionGenerator'
import { generateFallbackQuestion } from './fallbackQuestion'
import { getReviewPatterns, prioritizeMistakePatterns } from './mistakeReview'
import { recordMistakes } from './mistakeTracking'
import type { RandomSource } from '../utils/math'
import { reportDevelopmentError } from '../utils/developmentErrors'
import {
  isPracticeAttempt,
  isPracticeSession,
} from '../utils/storageValidation'

export const MAX_REPEAT_ATTEMPTS = 8
export const MAX_SESSION_GENERATION_FAILURES = 3
export const QUESTION_ERROR_MESSAGE =
  'That card got a little tangled. Let’s try again! Your marked answers are safe.'

interface SessionDependencies {
  generate?: typeof generateQuestion
  generateSimilar?: typeof generateSimilarQuestion
  generateFallback?: typeof generateFallbackQuestion
  generateSimilarFallback?: typeof generateFallbackReviewQuestion
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
    const options = {
      now: Date.parse(
        session.attempts.at(-1)?.attemptedAt ?? session.startedAt,
      ),
      random: dependencies.random,
    }
    try {
      queue = prioritizeMistakePatterns(patterns, options).map(
        (pattern) => pattern.id,
      )
    } catch (error) {
      reportDevelopmentError(
        'Review order randomization failed; using a deterministic order',
        error,
      )
      queue = prioritizeMistakePatterns(patterns, {
        ...options,
        random: () => 0,
      }).map((pattern) => pattern.id)
    }
    if (
      queue.length > 1 &&
      queue[0] === session.previousQuestion?.mistakePatternId
    )
      queue.push(queue.shift()!)
  }
  const pattern = byId.get(queue[0])!
  const options = {
    random: dependencies.random,
    createId: dependencies.createId,
    allowedOperations: session.operations,
    recentQuestions: session.attempts.slice(-5),
  }
  const next = withGeneratedCard(
    session,
    () =>
      (dependencies.generateSimilar ?? generateSimilarQuestion)(
        pattern,
        options,
      ),
    () =>
      (dependencies.generateSimilarFallback ?? generateFallbackReviewQuestion)(
        pattern,
        options,
      ),
    dependencies,
    pattern.id,
  )
  return {
    ...next,
    reviewQueue: queue.slice(1),
  }
}

/** Invalid generator output and duplicate options consume a finite retry budget. */
function withGeneratedCard(
  session: PracticeSessionState,
  generate: () => Question,
  fallback: () => Question,
  dependencies: SessionDependencies,
  patternId?: string,
): PracticeSessionState {
  const createId = dependencies.createId ?? createUniqueId
  const source = patternId ? 'mistake-review' : 'regular'
  function accept(question: unknown) {
    if (
      !isValidQuestion(question) ||
      question.source !== source ||
      question.difficulty !== session.difficulty ||
      !session.operations.includes(question.operation) ||
      (patternId && question.mistakePatternId !== patternId)
    )
      throw new Error(
        'Question failed arithmetic, choices, or practice-plan validation.',
      )
    return withCard(session, question, createId)
  }
  let repeated: PracticeSessionState | null = null,
    failures = 0,
    lastError: unknown
  for (let attempt = 0; attempt < MAX_REPEAT_ATTEMPTS; attempt++) {
    try {
      const next = accept(generate())
      if (
        patternId ||
        !session.previousQuestion ||
        !sameFact(next.currentQuestion!, session.previousQuestion)
      )
        return next
      repeated = next
    } catch (error) {
      lastError = error
      if (++failures >= MAX_SESSION_GENERATION_FAILURES) break
    }
  }
  if (repeated) return repeated
  reportDevelopmentError(
    'Question generation exhausted its retry budget; using a validated fallback',
    lastError,
  )
  return accept(fallback())
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
  try {
    if (session.mode === 'mistake-review')
      return withReviewQuestion(session, dependencies)
    return withGeneratedCard(
      session,
      () =>
        (dependencies.generate ?? generateQuestion)(
          session.operations,
          session.difficulty,
        ),
      () =>
        (dependencies.generateFallback ?? generateFallbackQuestion)(
          session,
          dependencies.createId,
        ),
      dependencies,
    )
  } catch (error) {
    reportDevelopmentError('Question and fallback generation failed', error)
    return {
      ...session,
      currentQuestion: null,
      questionError: QUESTION_ERROR_MESSAGE,
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
  if (!isPracticeSession(session))
    throw new Error('Session identity or timestamp is invalid.')
  return withNextQuestion(session, dependencies)
}

/** Generate only when a recovered cursor refers to an already recorded card. */
export function resumePracticeSession(
  session: PracticeSessionState,
  dependencies: SessionDependencies = {},
): PracticeSessionState {
  if (!session.isActive) return session
  if (
    session.sessionLength !== 'continuous' &&
    session.attempted >= session.sessionLength
  )
    return complete(session, dependencies)
  return session.currentQuestion
    ? session
    : withNextQuestion(session, dependencies)
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
  if (
    !isPracticeAttempt(attempt) ||
    session.attempts.some((a) => a.id === attempt.id)
  )
    throw new Error('Attempt identity, timestamp, or arithmetic is invalid.')
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
