import { QUESTION_SYMBOLS } from '../config/difficulty'
import type { MistakePattern } from '../types/mistake'
import type {
  ArithmeticQuestion,
  MathOperation,
  Question,
} from '../types/question'
import { createUniqueId } from '../utils/ids'
import { randomInt } from '../utils/math'
import { mistakePatternKey } from '../utils/mistakePattern'
import { isMistakePattern } from '../utils/storageValidation'
import {
  getQuestionErrors,
  isDifficultyLevel,
  isMathOperation,
  isValidArithmeticQuestion,
} from '../utils/validation'
import { generateAnswerChoices } from './answerChoices'
import { completeFallbackQuestion } from './fallbackQuestion'
import {
  DEFAULT_GENERATION_ATTEMPTS,
  MAX_GENERATION_ATTEMPTS,
  type GenerationOptions,
} from './questionGenerator'

export type SimilarityStrategy = 'nearby' | 'reversed' | 'fact-family'
export type RecentQuestion = Pick<
  Question,
  'operation' | 'firstOperand' | 'secondOperand' | 'difficulty'
>

export interface SimilarQuestionOptions extends GenerationOptions {
  /** Session skill selection also applies to inverse questions. */
  allowedOperations?: readonly MathOperation[]
  /** Omit to choose randomly among strategies with eligible candidates. */
  strategy?: SimilarityStrategy
  /** Oldest first; only the last five facts affect repetition avoidance. */
  recentQuestions?: readonly RecentQuestion[]
}

export const RECENT_SIMILAR_QUESTION_LIMIT = 5
export const NEARBY_OPERAND_DISTANCE = 2
const strategies: readonly SimilarityStrategy[] = [
  'nearby',
  'reversed',
  'fact-family',
]

export class SimilarQuestionGenerationError extends Error {
  readonly attempts: number

  constructor(attempts: number, cause: unknown) {
    super(
      `Could not generate a valid related question after ${attempts} attempts.`,
      { cause },
    )
    this.name = 'SimilarQuestionGenerationError'
    this.attempts = attempts
  }
}

function isRecentQuestion(value: unknown): value is RecentQuestion {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const fact = value as Record<string, unknown>
  return (
    isMathOperation(fact.operation) &&
    isDifficultyLevel(fact.difficulty) &&
    [fact.firstOperand, fact.secondOperand].every(
      (operand) =>
        typeof operand === 'number' &&
        Number.isSafeInteger(operand) &&
        operand >= 0,
    )
  )
}

function factIdentity(question: RecentQuestion): RecentQuestion {
  return {
    operation: question.operation,
    firstOperand: question.firstOperand,
    secondOperand: question.secondOperand,
    difficulty: question.difficulty,
  }
}

function readOptions(options: SimilarQuestionOptions) {
  if (typeof options !== 'object' || options === null || Array.isArray(options))
    throw new TypeError('Similar-question options must be an object.')
  const {
    strategy,
    random = Math.random,
    createId = createUniqueId,
    maxAttempts = DEFAULT_GENERATION_ATTEMPTS,
    recentQuestions = [],
    allowedOperations,
  } = options
  if (strategy !== undefined && !strategies.includes(strategy))
    throw new TypeError('Similarity strategy is unsupported.')
  if (
    allowedOperations !== undefined &&
    (!Array.isArray(allowedOperations) ||
      allowedOperations.length === 0 ||
      ![...allowedOperations].every(isMathOperation) ||
      new Set(allowedOperations).size !== allowedOperations.length)
  )
    throw new TypeError(
      'Choose distinct supported operations for review questions.',
    )
  if (typeof random !== 'function' || typeof createId !== 'function')
    throw new TypeError('Random and ID sources must be functions.')
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > MAX_GENERATION_ATTEMPTS
  )
    throw new RangeError(
      `Generation attempts must be between 1 and ${MAX_GENERATION_ATTEMPTS}.`,
    )
  if (
    !Array.isArray(recentQuestions) ||
    ![...recentQuestions].every(isRecentQuestion)
  )
    throw new TypeError(
      'Recent questions must contain valid arithmetic fact identities.',
    )
  return {
    strategy,
    random,
    createId,
    maxAttempts,
    allowedOperations: allowedOperations ? [...allowedOperations] : undefined,
    recentQuestions: recentQuestions
      .slice(-RECENT_SIMILAR_QUESTION_LIMIT)
      .map(factIdentity),
  }
}

/** Finite candidate enumeration keeps all fallback paths bounded. */
function relatedCandidates(pattern: MistakePattern) {
  const groups: Record<SimilarityStrategy, ArithmeticQuestion[]> = {
    nearby: [],
    reversed: [],
    'fact-family': [],
  }
  const keys: Record<SimilarityStrategy, Set<string>> = {
    nearby: new Set(),
    reversed: new Set(),
    'fact-family': new Set(),
  }
  const original = mistakePatternKey(pattern)
  function add(
    strategy: SimilarityStrategy,
    operation: MathOperation,
    first: number,
    second: number,
  ) {
    if (operation === 'division' && second <= 0) return
    const answer =
      operation === 'addition'
        ? first + second
        : operation === 'subtraction'
          ? first - second
          : operation === 'multiplication'
            ? first * second
            : first / second
    const candidate: ArithmeticQuestion = {
      id: pattern.id,
      operation,
      firstOperand: first,
      secondOperand: second,
      correctAnswer: answer,
      difficulty: pattern.difficulty,
      displayText: `${first} ${QUESTION_SYMBOLS[operation]} ${second} = ?`,
      source: 'mistake-review',
      mistakePatternId: pattern.id,
    }
    const key = mistakePatternKey(candidate)
    if (
      key === original ||
      keys[strategy].has(key) ||
      !isValidArithmeticQuestion(candidate)
    )
      return
    keys[strategy].add(key)
    groups[strategy].push(candidate)
  }

  const {
    operation,
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = pattern
  for (
    let left = -NEARBY_OPERAND_DISTANCE;
    left <= NEARBY_OPERAND_DISTANCE;
    left++
  ) {
    for (
      let right = -NEARBY_OPERAND_DISTANCE;
      right <= NEARBY_OPERAND_DISTANCE;
      right++
    ) {
      add('nearby', operation, first + left, second + right)
      if (operation === 'division') {
        // Neighboring divisors/quotients form an exact dividend by construction.
        const divisor = second + right
        add('nearby', operation, (answer + left) * divisor, divisor)
      }
    }
  }
  if (operation === 'addition' || operation === 'multiplication')
    add('reversed', operation, second, first)

  switch (operation) {
    case 'addition':
      add('fact-family', 'subtraction', answer, first)
      add('fact-family', 'subtraction', answer, second)
      break
    case 'subtraction':
      add('fact-family', 'addition', second, answer)
      add('fact-family', 'addition', answer, second)
      add('fact-family', 'subtraction', first, answer)
      break
    case 'multiplication':
      add('fact-family', 'division', answer, first)
      add('fact-family', 'division', answer, second)
      break
    case 'division':
      add('fact-family', 'multiplication', second, answer)
      add('fact-family', 'multiplication', answer, second)
      add('fact-family', 'division', first, answer)
      break
  }
  return groups
}

/** Generate a related fact at the pattern's difficulty, with four answer choices. */
export function generateSimilarQuestion(
  pattern: MistakePattern,
  options: SimilarQuestionOptions = {},
): Question {
  if (!isMistakePattern(pattern))
    throw new TypeError('A valid mistake pattern is required.')
  const {
    strategy,
    random,
    createId,
    maxAttempts,
    recentQuestions,
    allowedOperations,
  } = readOptions(options)
  const groups = relatedCandidates(pattern)
  if (allowedOperations)
    for (const name of strategies)
      groups[name] = groups[name].filter((question) =>
        allowedOperations.includes(question.operation),
      )
  const enabled = strategy ? [strategy] : strategies
  const candidates = enabled.flatMap((name) => groups[name])
  if (candidates.length === 0)
    throw new SimilarQuestionGenerationError(
      0,
      new RangeError(
        'No related question for this strategy fits the original difficulty.',
      ),
    )

  const lastUsed = new Map(
    recentQuestions.map((question, index) => [
      mistakePatternKey(question),
      index,
    ]),
  )
  const rank = (question: ArithmeticQuestion) =>
    lastUsed.get(mistakePatternKey(question)) ?? -1
  // Prefer unseen facts across all strategies. If exhausted, use the least
  // recently seen fact; never relax arithmetic bounds or return the original.
  const oldest = Math.min(...candidates.map(rank))
  const eligible = enabled
    .map((name) => groups[name].filter((question) => rank(question) === oldest))
    .filter((group) => group.length > 0)
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const group = eligible[randomInt(0, eligible.length - 1, random)]
      const candidate = group[randomInt(0, group.length - 1, random)]
      const core = { ...candidate, id: createId() }
      const question: Question = {
        ...core,
        choices: generateAnswerChoices(core, { random }),
      }
      const errors = getQuestionErrors(question)
      if (errors.length > 0) throw new Error(errors.join(' '))
      return question
    } catch (error) {
      lastError = error
    }
  }
  throw new SimilarQuestionGenerationError(maxAttempts, lastError)
}

/** Own a small history per review consumer; no global state or persistence. */
export function createSimilarQuestionGenerator(
  options: SimilarQuestionOptions = {},
) {
  const settings = readOptions(options)
  let recentQuestions = settings.recentQuestions
  return (pattern: MistakePattern): Question => {
    const question = generateSimilarQuestion(pattern, {
      ...settings,
      recentQuestions,
    })
    recentQuestions = [...recentQuestions, factIdentity(question)].slice(
      -RECENT_SIMILAR_QUESTION_LIMIT,
    )
    return question
  }
}

/** Deterministic related fallback; never substitute an unrelated regular fact. */
export function generateFallbackReviewQuestion(
  pattern: MistakePattern,
  options: Pick<
    SimilarQuestionOptions,
    'allowedOperations' | 'recentQuestions' | 'createId'
  > = {},
): Question {
  if (!isMistakePattern(pattern))
    throw new TypeError('A valid mistake pattern is required.')
  const recent = new Set(
    (options.recentQuestions ?? [])
      .slice(-RECENT_SIMILAR_QUESTION_LIMIT)
      .map(mistakePatternKey),
  )
  const candidates = Object.values(relatedCandidates(pattern))
    .flat()
    .filter(
      (q) =>
        !options.allowedOperations ||
        options.allowedOperations.includes(q.operation),
    )
  const core =
    candidates.find((q) => !recent.has(mistakePatternKey(q))) ?? candidates[0]
  if (!core) throw new Error('No related fallback fits this practice plan.')
  return completeFallbackQuestion({
    ...core,
    id: (options.createId ?? createUniqueId)(),
  })
}
