import type { ArithmeticQuestion } from '../types/question'
import { randomInt, type RandomSource } from '../utils/math'
import { shuffleArray } from '../utils/shuffle'
import { getArithmeticQuestionErrors } from '../utils/validation'

export const DEFAULT_DISTRACTOR_ATTEMPTS = 12
export const MAX_DISTRACTOR_ATTEMPTS = 32

export interface AnswerChoiceOptions {
  random?: RandomSource
  maxAttempts?: number
}

function operationMistakes(question: ArithmeticQuestion): number[] {
  const {
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = question
  switch (question.operation) {
    case 'addition':
      // Omitting an addend or missing/adding a carry of ten.
      return [first, second, answer - 10, answer + 10]
    case 'subtraction':
      // Using addition, or mishandling a borrow of ten.
      return [first + second, answer + 10, answer - 10]
    case 'multiplication':
      // Adjacent table facts, plus confusing multiplication with addition.
      return [
        (first - 1) * second,
        (first + 1) * second,
        first * (second - 1),
        first * (second + 1),
        first + second,
      ]
    case 'division': {
      // Neighboring dividends in the same fact family; a neighboring divisor
      // is usable only when its answer is also a whole number.
      const neighboringDivisors = [second - 1, second + 1].filter(
        (divisor) => divisor > 0 && first % divisor === 0,
      )
      return [
        (first - second) / second,
        (first + second) / second,
        (first - 2 * second) / second,
        (first + 2 * second) / second,
        ...neighboringDivisors.map((divisor) => first / divisor),
      ]
    }
  }
}

/** Three distinct, nonnegative integer distractors for a validated arithmetic core. */
export function generateDistractors(
  question: ArithmeticQuestion,
  options: AnswerChoiceOptions = {},
): number[] {
  const errors = getArithmeticQuestionErrors(question)
  if (errors.length > 0)
    throw new TypeError(`Invalid arithmetic question: ${errors.join(' ')}`)
  if (typeof options !== 'object' || options === null || Array.isArray(options))
    throw new TypeError('Answer-choice options must be an object.')
  const { random = Math.random, maxAttempts = DEFAULT_DISTRACTOR_ATTEMPTS } =
    options
  if (typeof random !== 'function')
    throw new TypeError('Random source must be a function.')
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > MAX_DISTRACTOR_ATTEMPTS
  )
    throw new RangeError(
      `Distractor attempts must be between 1 and ${MAX_DISTRACTOR_ATTEMPTS}.`,
    )

  const answer = question.correctAnswer
  // A modest neighborhood filters out remote operation mistakes. Small answers
  // still have room for three alternatives; carrying mistakes can differ by ten.
  const radius = Math.max(3, Math.min(10, answer), Math.ceil(answer / 4))
  const nearby = [-1, 1, -2, 2, -3, 3].map((offset) => answer + offset)
  const candidates = [
    ...new Set([...operationMistakes(question), ...nearby]),
  ].filter(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value !== answer &&
      Math.abs(value - answer) <= radius,
  )
  const distractors = new Set<number>()
  for (
    let attempt = 0;
    attempt < maxAttempts && distractors.size < 3;
    attempt++
  ) {
    distractors.add(candidates[randomInt(0, candidates.length - 1, random)])
  }
  // This finite scan guarantees completion even if the RNG keeps picking the
  // same candidate. Nearby +1, +2, +3 values are safe integers for supported cores.
  for (const candidate of candidates) {
    if (distractors.size === 3) break
    distractors.add(candidate)
  }
  return [...distractors]
}

/** Returns four shuffled choices without modifying the input question. */
export function generateAnswerChoices(
  question: ArithmeticQuestion,
  options: AnswerChoiceOptions = {},
): number[] {
  const distractors = generateDistractors(question, options)
  return shuffleArray(
    [question.correctAnswer, ...distractors],
    options.random ?? Math.random,
  )
}
