import { expect, test, vi } from 'vitest'
import type {
  Question,
  DifficultyLevel,
  MathOperation,
} from '../types/question'
import { isValidQuestion } from '../utils/validation'
import {
  generateAdditionQuestion,
  generateDivisionQuestion,
  generateMultiplicationQuestion,
  generateQuestion,
  generateSubtractionQuestion,
  QuestionGenerationError,
} from './questionGenerator'

const HIGH = 1 - Number.EPSILON
const levels = [1, 2, 3, 4] as const
const operations = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const
const operandBounds = [
  [1, 0, 10],
  [2, 0, 50],
  [3, 0, 100],
  [4, 10, 1000],
] as const

function sequence(...values: number[]) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function expectRange(value: number, minimum: number, maximum: number) {
  expect(Number.isSafeInteger(value)).toBe(true)
  expect(value).toBeGreaterThanOrEqual(minimum)
  expect(value).toBeLessThanOrEqual(maximum)
}

// Expectations below are independent fixtures from Section 7 and the documented defaults.
function expectArithmetic(
  question: Question,
  operation: MathOperation,
  difficulty: DifficultyLevel,
) {
  const {
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = question
  expect(question.id.length).toBeGreaterThan(0)
  expect(question.operation).toBe(operation)
  expect(question.difficulty).toBe(difficulty)
  expect(question.source).toBe('regular')
  expect(question.choices).toHaveLength(4)
  expect(new Set(question.choices).size).toBe(4)
  expect(question.choices.filter((choice) => choice === answer)).toHaveLength(1)
  expect(
    question.choices.every(
      (choice) => Number.isSafeInteger(choice) && choice >= 0,
    ),
  ).toBe(true)
  expect(Number.isSafeInteger(answer)).toBe(true)
  expect(answer).toBeGreaterThanOrEqual(0)
  const symbols = {
    addition: '+',
    subtraction: '−',
    multiplication: '×',
    division: '÷',
  }
  expect(question.displayText).toBe(
    `${first} ${symbols[operation]} ${second} = ?`,
  )
  switch (operation) {
    case 'addition':
    case 'subtraction': {
      const [, minimum, maximum] = operandBounds[difficulty - 1]
      expectRange(first, minimum, maximum)
      expectRange(second, minimum, maximum)
      if (operation === 'addition') {
        expect(answer).toBe(first + second)
        expect(answer).toBeLessThanOrEqual([20, 100, 200, 2000][difficulty - 1])
      } else {
        expect(first).toBeGreaterThanOrEqual(second)
        expect(answer).toBe(first - second)
      }
      break
    }
    case 'multiplication':
      expect(answer).toBe(first * second)
      if (difficulty <= 2) {
        const maximum = difficulty === 1 ? 5 : 10
        expectRange(first, 0, maximum)
        expectRange(second, 0, maximum)
      } else if (difficulty === 3) {
        expectRange(first, 0, 99)
        expectRange(second, 0, 99)
        expect(first <= 9 || second <= 9).toBe(true)
      } else {
        expectRange(first, 0, 99)
        expectRange(second, 0, 99)
        expect(first >= 10 || second >= 10).toBe(true)
      }
      break
    case 'division':
      expectRange(second, 1, [5, 10, 12, 99][difficulty - 1])
      expect(first % second).toBe(0)
      expect(answer).toBe(first / second)
      expectRange(
        first,
        difficulty === 4 ? 145 : 0,
        [25, 100, 144, 1000][difficulty - 1],
      )
      if (difficulty <= 2)
        expect(answer).toBeLessThanOrEqual(difficulty === 1 ? 5 : 10)
      break
  }
  expect(isValidQuestion(question)).toBe(true)
}

test.each(operandBounds)(
  'addition Level %s reaches both operand and answer boundaries',
  (difficulty, minimum, maximum) => {
    const low = generateAdditionQuestion(difficulty, { random: () => 0 })
    const high = generateAdditionQuestion(difficulty, { random: () => HIGH })
    expect([low.firstOperand, low.secondOperand, low.correctAnswer]).toEqual([
      minimum,
      minimum,
      minimum * 2,
    ])
    expect([high.firstOperand, high.secondOperand, high.correctAnswer]).toEqual(
      [maximum, maximum, maximum * 2],
    )
    expectArithmetic(low, 'addition', difficulty)
    expectArithmetic(high, 'addition', difficulty)
  },
)

test.each(operandBounds)(
  'subtraction Level %s orders operands and reaches zero and its largest answer',
  (difficulty, minimum, maximum) => {
    const low = generateSubtractionQuestion(difficulty, { random: () => 0 })
    const high = generateSubtractionQuestion(difficulty, { random: () => HIGH })
    const swapped = generateSubtractionQuestion(difficulty, {
      random: sequence(0, HIGH),
    })
    expect([low.firstOperand, low.secondOperand, low.correctAnswer]).toEqual([
      minimum,
      minimum,
      0,
    ])
    expect([high.firstOperand, high.secondOperand, high.correctAnswer]).toEqual(
      [maximum, maximum, 0],
    )
    expect([
      swapped.firstOperand,
      swapped.secondOperand,
      swapped.correctAnswer,
    ]).toEqual([maximum, minimum, maximum - minimum])
    for (const question of [low, high, swapped])
      expectArithmetic(question, 'subtraction', difficulty)
  },
)

test.each([
  [1, null, 0, 5, 0, 5],
  [2, null, 0, 10, 0, 10],
  [3, 0, 0, 9, 0, 9],
  [3, HIGH, 0, 9, 10, 99],
  [4, 0, 10, 99, 0, 9],
  [4, HIGH, 10, 99, 10, 99],
] as const)(
  'multiplication Level %s family %s includes both factor boundaries',
  (difficulty, family, firstMin, firstMax, secondMin, secondMax) => {
    const low = generateMultiplicationQuestion(difficulty, {
      random: sequence(...(family === null ? [] : [family]), 0, 0),
    })
    const high = generateMultiplicationQuestion(difficulty, {
      random: sequence(...(family === null ? [] : [family]), HIGH, HIGH),
    })
    expect([low.firstOperand, low.secondOperand, low.correctAnswer]).toEqual([
      firstMin,
      secondMin,
      firstMin * secondMin,
    ])
    expect([high.firstOperand, high.secondOperand, high.correctAnswer]).toEqual(
      [firstMax, secondMax, firstMax * secondMax],
    )
    expectArithmetic(low, 'multiplication', difficulty)
    expectArithmetic(high, 'multiplication', difficulty)
  },
)

test.each([
  [1, 5, 0, 5, 5],
  [2, 10, 0, 10, 10],
  [3, 12, 0, 12, 144],
  [4, 99, 145, 10, 1000],
] as const)(
  'division Level %s respects divisors, quotient bounds, and dividend caps',
  (
    difficulty,
    divisorMax,
    quotientMin,
    quotientAtMaxDivisor,
    dividendAtOne,
  ) => {
    const low = generateDivisionQuestion(difficulty, { random: () => 0 })
    const high = generateDivisionQuestion(difficulty, { random: () => HIGH })
    const largestAtOne = generateDivisionQuestion(difficulty, {
      random: sequence(0, HIGH),
    })
    expect([low.firstOperand, low.secondOperand, low.correctAnswer]).toEqual([
      quotientMin,
      1,
      quotientMin,
    ])
    expect([high.firstOperand, high.secondOperand, high.correctAnswer]).toEqual(
      [divisorMax * quotientAtMaxDivisor, divisorMax, quotientAtMaxDivisor],
    )
    expect(largestAtOne.firstOperand).toBe(dividendAtOne)
    for (const question of [low, high, largestAtOne])
      expectArithmetic(question, 'division', difficulty)
  },
)

test.each(
  operations.flatMap((operation) =>
    levels.map((difficulty) => [operation, difficulty] as const),
  ),
)(
  '%s Level %s remains valid across 128 reproducible samples',
  (operation, difficulty) => {
    const seed = 100 + difficulty
    const random = seededRandom(seed)
    const ids = new Set<string>()
    for (let index = 0; index < 128; index++) {
      let question: Question | undefined
      try {
        question = generateQuestion(operation, difficulty, { random })
        expectArithmetic(question, operation, difficulty)
        expect(ids.has(question.id), 'Generated IDs must be unique.').toBe(
          false,
        )
        ids.add(question.id)
      } catch (cause) {
        throw new Error(
          `${operation} Level ${difficulty}, seed=${seed}, sample=${index} (zero-based)\nquestion=${JSON.stringify(question)}\nReplay: npm test -- src/services/questionGenerator.test.ts -t '${operation} Level ${difficulty} remains valid'`,
          { cause },
        )
      }
    }
    expect(ids.size).toBe(128)
  },
)

test.each(operations.map((operation, index) => [operation, index] as const))(
  'mixed selection can select %s',
  (operation, index) => {
    expect(
      generateQuestion(operations, 2, {
        random: sequence((index + 0.1) / 4, 0.5),
      }).operation,
    ).toBe(operation)
  },
)

test('mixed selection uses only the enabled operations and does not mutate them', () => {
  const enabled = Object.freeze(['subtraction', 'division'] as const)
  const random = seededRandom(42)
  const selected = new Set(
    Array.from(
      { length: 128 },
      () => generateQuestion(enabled, 3, { random }).operation,
    ),
  )
  expect(selected).toEqual(new Set(enabled))
  expect(enabled).toEqual(['subtraction', 'division'])
})

test.each(
  [
    [],
    ['addition', 'addition'],
    ['power'],
    ['addition', undefined],
    new Array(1),
    null,
    'mixed',
    'constructor',
  ].map((operation) => ({ operation })),
)(
  'rejects invalid operations $operation before generation',
  ({ operation }) => {
    const random = vi.fn(() => 0)
    expect(() =>
      generateQuestion(operation as MathOperation, 1, { random }),
    ).toThrow(TypeError)
    expect(random).not.toHaveBeenCalled()
  },
)

test.each([0, 5, 1.5, NaN, Infinity])(
  'rejects unsupported difficulty %s before generation',
  (difficulty) => {
    const random = vi.fn(() => 0)
    expect(() =>
      generateQuestion('addition', difficulty as DifficultyLevel, { random }),
    ).toThrow(RangeError)
    expect(random).not.toHaveBeenCalled()
  },
)

test.each([0, 11, 1.5, Infinity, NaN])(
  'rejects unbounded or invalid retry count %s',
  (maxAttempts) => {
    expect(() => generateQuestion('addition', 1, { maxAttempts })).toThrow(
      RangeError,
    )
  },
)

test('limits failing randomness to three attempts and retains the cause', () => {
  const random = vi.fn(() => NaN)
  let error: unknown
  try {
    generateQuestion('addition', 1, { random })
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(QuestionGenerationError)
  expect(error).toMatchObject({ attempts: 3, cause: expect.any(RangeError) })
  expect(random).toHaveBeenCalledTimes(3)
})

test('retries an invalid generated ID and returns only a validated result', () => {
  const createId = vi
    .fn()
    .mockReturnValueOnce(' ')
    .mockReturnValue('valid-after-retry')
  const question = generateQuestion('multiplication', 4, {
    random: () => 0.5,
    createId,
  })
  expect(question.id).toBe('valid-after-retry')
  expect(createId).toHaveBeenCalledTimes(2)
  expectArithmetic(question, 'multiplication', 4)
})

test('bounds unexpected ID failures at the configured attempt count', () => {
  const cause = new Error('ID source failed')
  const createId = vi.fn(() => {
    throw cause
  })
  expect(() =>
    generateQuestion('division', 3, {
      random: () => 0.5,
      createId,
      maxAttempts: 2,
    }),
  ).toThrow(QuestionGenerationError)
  expect(createId).toHaveBeenCalledTimes(2)
})

test('bounds failures in answer-choice randomness and retains their cause', () => {
  let draws = 0
  // Two valid operand draws, followed by an invalid draw for distractor selection.
  const random = vi.fn(() => [0.5, 0.5, NaN][draws++ % 3])
  let failure: unknown
  try {
    generateQuestion('addition', 1, { random, maxAttempts: 2 })
  } catch (error) {
    failure = error
  }
  expect(failure).toBeInstanceOf(QuestionGenerationError)
  expect(failure).toMatchObject({ attempts: 2, cause: expect.any(RangeError) })
  expect(random).toHaveBeenCalledTimes(6)
})
