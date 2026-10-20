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

export function isMathOperation(value: unknown): value is MathOperation {
  return typeof value === 'string' && Object.hasOwn(QUESTION_SYMBOLS, value)
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function inRange(value: number, range: IntegerRange): boolean {
  return value >= range.min && value <= range.max
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function nonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Checks arithmetic independently of the answer-choice presentation. */
export function getArithmeticQuestionErrors(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return ['Question must be an object.']
  const question = value as Record<string, unknown>
  const errors: string[] = []
  if (!nonemptyString(question.id))
    errors.push('Question ID must be a nonempty string.')
  if (question.source !== 'regular' && question.source !== 'mistake-review')
    errors.push('Question source is unsupported.')
  if (
    question.source === 'mistake-review' &&
    !nonemptyString(question.mistakePatternId)
  )
    errors.push('Review questions must reference a mistake pattern.')
  if (
    question.mistakePatternId !== undefined &&
    !nonemptyString(question.mistakePatternId)
  )
    errors.push('Mistake pattern ID must be a nonempty string when present.')

  const {
    operation,
    difficulty,
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = question
  if (!isMathOperation(operation)) errors.push('Operation is unsupported.')
  if (!isDifficultyLevel(difficulty))
    errors.push('Difficulty must be 1, 2, 3, or 4.')
  if (
    !nonnegativeInteger(first) ||
    !nonnegativeInteger(second) ||
    !nonnegativeInteger(answer)
  ) {
    errors.push('Operands and answer must be nonnegative safe integers.')
    return errors
  }
  if (!isMathOperation(operation) || !isDifficultyLevel(difficulty))
    return errors

  const rules = difficultyRules[difficulty]
  let expectedAnswer: number
  switch (operation) {
    case 'addition':
      expectedAnswer = first + second
      if (
        !inRange(first, rules.addition.operands) ||
        !inRange(second, rules.addition.operands) ||
        answer > rules.addition.maximumAnswer
      )
        errors.push('Addition exceeds its difficulty boundaries.')
      break
    case 'subtraction':
      expectedAnswer = first - second
      if (
        !inRange(first, rules.subtraction.operands) ||
        !inRange(second, rules.subtraction.operands) ||
        first < second
      )
        errors.push(
          'Subtraction must stay within its boundaries and have a nonnegative answer.',
        )
      break
    case 'multiplication':
      expectedAnswer = first * second
      if (
        !rules.multiplication.factorPairs.some(
          (pair) =>
            (inRange(first, pair.first) && inRange(second, pair.second)) ||
            (inRange(second, pair.first) && inRange(first, pair.second)),
        )
      )
        errors.push('Factors do not match an allowed difficulty family.')
      break
    case 'division':
      if (second === 0) {
        errors.push('Division by zero is forbidden.')
        return errors
      }
      expectedAnswer = first / second
      if (
        first % second !== 0 ||
        !inRange(second, rules.division.divisors) ||
        !inRange(first, rules.division.dividends) ||
        (rules.division.quotients && !inRange(answer, rules.division.quotients))
      )
        errors.push(
          'Division must have a whole answer within its difficulty boundaries.',
        )
      break
  }
  if (answer !== expectedAnswer)
    errors.push('The correct answer does not match the operands.')
  if (
    question.displayText !==
    `${first} ${QUESTION_SYMBOLS[operation]} ${second} = ?`
  )
    errors.push('Display text does not match the question.')
  return errors
}

export function isValidArithmeticQuestion(
  value: unknown,
): value is ArithmeticQuestion {
  return getArithmeticQuestionErrors(value).length === 0
}

/** Validates a complete question, including all four answer choices. */
export function getQuestionErrors(value: unknown): string[] {
  const errors = getArithmeticQuestionErrors(value)
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return errors
  const question = value as Record<string, unknown>
  const choices = question.choices
  if (!Array.isArray(choices) || choices.length !== 4) {
    errors.push('Questions must contain exactly four answer choices.')
    return errors
  }
  // Array.from also exposes holes in sparse arrays rather than skipping them.
  if (!Array.from(choices).every(nonnegativeInteger))
    errors.push('Answer choices must be nonnegative safe integers.')
  if (new Set(choices).size !== 4) errors.push('Answer choices must be unique.')
  if (
    choices.filter((choice) => choice === question.correctAnswer).length !== 1
  )
    errors.push('The correct answer must appear exactly once.')
  return errors
}

export function isValidQuestion(value: unknown): value is Question {
  return getQuestionErrors(value).length === 0
}
