import {
  difficultyRules,
  QUESTION_SYMBOLS,
  type IntegerRange,
} from '../config/difficulty'
import type {
  ArithmeticQuestion,
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import { createUniqueId } from '../utils/ids'
import { randomInt, type RandomSource } from '../utils/math'
import {
  getQuestionErrors,
  isDifficultyLevel,
  isMathOperation,
} from '../utils/validation'
import { generateAnswerChoices } from './answerChoices'

export const DEFAULT_GENERATION_ATTEMPTS = 3
export const MAX_GENERATION_ATTEMPTS = 10

export interface GenerationOptions {
  random?: RandomSource
  createId?: () => string
  maxAttempts?: number
}

export class QuestionGenerationError extends Error {
  readonly attempts: number

  constructor(attempts: number, cause: unknown) {
    super(`Could not generate a valid question after ${attempts} attempts.`, {
      cause,
    })
    this.name = 'QuestionGenerationError'
    this.attempts = attempts
  }
}

interface Equation {
  first: number
  second: number
  answer: number
}

function isOperationSelection(
  value: unknown,
): value is readonly [MathOperation, ...MathOperation[]] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    [...value].every(isMathOperation) &&
    new Set(value).size === value.length
  )
}

function generateEquation(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  random: RandomSource,
): Equation {
  const rules = difficultyRules[difficulty]
  const pick = (range: IntegerRange) => randomInt(range.min, range.max, random)

  switch (operation) {
    case 'addition': {
      const first = pick(rules.addition.operands)
      const second = randomInt(
        rules.addition.operands.min,
        Math.min(
          rules.addition.operands.max,
          rules.addition.maximumAnswer - first,
        ),
        random,
      )
      return { first, second, answer: first + second }
    }
    case 'subtraction': {
      const left = pick(rules.subtraction.operands)
      const right = pick(rules.subtraction.operands)
      const first = Math.max(left, right)
      const second = Math.min(left, right)
      return { first, second, answer: first - second }
    }
    case 'multiplication': {
      const families = rules.multiplication.factorPairs
      const family = families[randomInt(0, families.length - 1, random)]
      const first = pick(family.first)
      const second = pick(family.second)
      return { first, second, answer: first * second }
    }
    case 'division': {
      const second = pick(rules.division.divisors)
      const minimum = Math.max(
        rules.division.quotients?.min ?? 0,
        Math.ceil(rules.division.dividends.min / second),
      )
      const maximum = Math.min(
        rules.division.quotients?.max ?? Number.MAX_SAFE_INTEGER,
        Math.floor(rules.division.dividends.max / second),
      )
      const answer = randomInt(minimum, maximum, random)
      return { first: second * answer, second, answer }
    }
  }
}

/** Generates a complete arithmetic question with four shuffled answer choices. */
export function generateQuestion(
  operationOrOperations: MathOperation | readonly MathOperation[],
  difficulty: DifficultyLevel,
  options: GenerationOptions = {},
): Question {
  const operations =
    typeof operationOrOperations === 'string'
      ? [operationOrOperations]
      : operationOrOperations
  if (!isOperationSelection(operations))
    throw new TypeError('Select one or more distinct supported operations.')
  if (!isDifficultyLevel(difficulty))
    throw new RangeError('Difficulty must be 1, 2, 3, or 4.')
  if (typeof options !== 'object' || options === null || Array.isArray(options))
    throw new TypeError('Generation options must be an object.')
  const {
    random = Math.random,
    createId = createUniqueId,
    maxAttempts = DEFAULT_GENERATION_ATTEMPTS,
  } = options
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

  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const operation = operations[randomInt(0, operations.length - 1, random)]
      const { first, second, answer } = generateEquation(
        operation,
        difficulty,
        random,
      )
      const core: ArithmeticQuestion = {
        id: createId(),
        operation,
        firstOperand: first,
        secondOperand: second,
        correctAnswer: answer,
        difficulty,
        displayText: `${first} ${QUESTION_SYMBOLS[operation]} ${second} = ?`,
        source: 'regular',
      }
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
  throw new QuestionGenerationError(maxAttempts, lastError)
}

export function generateAdditionQuestion(
  difficulty: DifficultyLevel,
  options?: GenerationOptions,
): Question {
  return generateQuestion('addition', difficulty, options)
}

export function generateSubtractionQuestion(
  difficulty: DifficultyLevel,
  options?: GenerationOptions,
): Question {
  return generateQuestion('subtraction', difficulty, options)
}

export function generateMultiplicationQuestion(
  difficulty: DifficultyLevel,
  options?: GenerationOptions,
): Question {
  return generateQuestion('multiplication', difficulty, options)
}

export function generateDivisionQuestion(
  difficulty: DifficultyLevel,
  options?: GenerationOptions,
): Question {
  return generateQuestion('division', difficulty, options)
}
