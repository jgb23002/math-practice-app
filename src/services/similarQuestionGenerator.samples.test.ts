import { expect, test } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import type { MistakePattern } from '../types/mistake'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import { generateQuestion } from './questionGenerator'
import {
  createSimilarQuestionGenerator,
  generateSimilarQuestion,
} from './similarQuestionGenerator'

const operations = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const
const levels = [1, 2, 3, 4] as const
const seeds = [0, 1, 0x5eed1234, 0xffffffff] as const
const HIGH = 1 - Number.EPSILON
// Independent Section 7 bounds, including the previously approved defaults.
const bounds = {
  1: {
    min: 0,
    max: 10,
    maxSum: 20,
    divisor: 5,
    minDividend: 0,
    maxDividend: 25,
    quotient: 5,
  },
  2: {
    min: 0,
    max: 50,
    maxSum: 100,
    divisor: 10,
    minDividend: 0,
    maxDividend: 100,
    quotient: 10,
  },
  3: {
    min: 0,
    max: 100,
    maxSum: 200,
    divisor: 12,
    minDividend: 0,
    maxDividend: 144,
    quotient: 144,
  },
  4: {
    min: 10,
    max: 1000,
    maxSum: 2000,
    divisor: 99,
    minDividend: 145,
    maxDividend: 1000,
    quotient: 1000,
  },
} as const
const symbols = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

function key(
  question: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
) {
  return `${question.operation}:${question.firstOperand}:${question.secondOperand}`
}
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}
function makePattern(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  difficulty: DifficultyLevel,
) {
  const correctAnswer =
    operation === 'addition'
      ? firstOperand + secondOperand
      : operation === 'subtraction'
        ? firstOperand - secondOperand
        : operation === 'multiplication'
          ? firstOperand * secondOperand
          : firstOperand / secondOperand
  return createMistakePattern({
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    difficulty,
  })
}

function expectBounds(question: Question) {
  const {
    operation,
    difficulty,
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = question
  const rule = bounds[difficulty]
  for (const number of [first, second, answer]) {
    expect(Number.isSafeInteger(number)).toBe(true)
    expect(number).toBeGreaterThanOrEqual(0)
  }
  expect(question.displayText).toBe(
    `${first} ${symbols[operation]} ${second} = ?`,
  )
  switch (operation) {
    case 'addition':
    case 'subtraction':
      for (const operand of [first, second]) {
        expect(operand).toBeGreaterThanOrEqual(rule.min)
        expect(operand).toBeLessThanOrEqual(rule.max)
      }
      if (operation === 'addition') {
        expect(answer).toBe(first + second)
        expect(answer).toBeLessThanOrEqual(rule.maxSum)
      } else {
        expect(first).toBeGreaterThanOrEqual(second)
        expect(answer).toBe(first - second)
      }
      break
    case 'multiplication':
      expect(answer).toBe(first * second)
      if (difficulty <= 2) {
        expect(first).toBeLessThanOrEqual(difficulty === 1 ? 5 : 10)
        expect(second).toBeLessThanOrEqual(difficulty === 1 ? 5 : 10)
      } else {
        expect(first).toBeLessThanOrEqual(99)
        expect(second).toBeLessThanOrEqual(99)
        expect(
          difficulty === 3
            ? first <= 9 || second <= 9
            : first >= 10 || second >= 10,
        ).toBe(true)
      }
      break
    case 'division':
      expect(second).toBeGreaterThan(0)
      expect(second).toBeLessThanOrEqual(rule.divisor)
      expect(first).toBeGreaterThanOrEqual(rule.minDividend)
      expect(first).toBeLessThanOrEqual(rule.maxDividend)
      expect(first % second).toBe(0)
      expect(answer).toBe(first / second)
      expect(answer).toBeLessThanOrEqual(rule.quotient)
      break
  }
}

function expectRelated(question: Question, original: MistakePattern) {
  expectBounds(question)
  expect(question.id.trim()).not.toBe('')
  expect(question.source).toBe('mistake-review')
  expect(question.mistakePatternId).toBe(original.id)
  expect(question.difficulty).toBe(original.difficulty)
  expect(key(question)).not.toBe(key(original))
  expect(question.choices).toHaveLength(4)
  expect(new Set(question.choices).size).toBe(4)
  expect(
    question.choices.filter((answer) => answer === question.correctAnswer),
  ).toHaveLength(1)
  expect(
    question.choices.every(
      (answer) => Number.isSafeInteger(answer) && answer >= 0,
    ),
  ).toBe(true)
  const firstDelta = Math.abs(question.firstOperand - original.firstOperand)
  const secondDelta = Math.abs(question.secondOperand - original.secondOperand)
  const quotientDelta = Math.abs(
    question.correctAnswer - original.correctAnswer,
  )
  const nearby =
    question.operation === original.operation &&
    secondDelta <= 2 &&
    (firstDelta <= 2 ||
      (original.operation === 'division' && quotientDelta <= 2))
  const additive = (operation: MathOperation) =>
    operation === 'addition' || operation === 'subtraction'
  const family =
    additive(question.operation) === additive(original.operation) &&
    JSON.stringify(
      [
        question.firstOperand,
        question.secondOperand,
        question.correctAnswer,
      ].sort((a, b) => a - b),
    ) ===
      JSON.stringify(
        [
          original.firstOperand,
          original.secondOperand,
          original.correctAnswer,
        ].sort((a, b) => a - b),
      )
  expect(
    nearby || family,
    'Question must use nearby numbers or the original three-number fact family.',
  ).toBe(true)
}

const batches = operations.flatMap((operation) =>
  levels.flatMap((difficulty) =>
    seeds.map((seed) => ({ operation, difficulty, seed })),
  ),
)
test.each(batches)(
  '$operation Level $difficulty seed $seed: 128 related samples stay valid',
  ({ operation, difficulty, seed }) => {
    const source = seededRandom(seed)
    let draws: number[] = []
    const random = () => {
      const value = source()
      draws.push(value)
      return value
    }
    let serial = 0
    const generate = createSimilarQuestionGenerator({
      random,
      createId: () => `review-${serial++}`,
    })
    const ids = new Set<string>()
    const positions = new Set<number>()
    for (let index = 0; index < 128; index++) {
      draws = []
      let original: MistakePattern | undefined
      let review: Question | undefined
      try {
        const question = generateQuestion(operation, difficulty, {
          random,
          createId: () => `original-${index}`,
        })
        expectBounds(question)
        original = makePattern(
          operation,
          question.firstOperand,
          question.secondOperand,
          difficulty,
        )
        original.id = `mistake-${index}`
        review = generate(original)
        expectRelated(review, original)
        expect(ids.has(review.id)).toBe(false)
        ids.add(review.id)
        positions.add(review.choices.indexOf(review.correctAnswer))
        const nearby = generateSimilarQuestion(original, {
          strategy: 'nearby',
          random,
          createId: () => `nearby-${index}`,
        })
        expect(nearby.operation).toBe(operation)
        expectRelated(nearby, original)
      } catch (cause) {
        throw new Error(
          `${operation} Level ${difficulty}, seed=${seed}, sample=${index} (zero-based)\noriginal=${JSON.stringify(original)}\nreview=${JSON.stringify(review)}\nrandomDraws=${JSON.stringify(draws)}\nReplay: npm test -- src/services/similarQuestionGenerator.samples.test.ts -t '${operation} Level ${difficulty} seed ${seed}:'`,
          { cause },
        )
      }
    }
    expect(ids.size).toBe(128)
    expect(positions).toEqual(new Set([0, 1, 2, 3]))
  },
)

const edges: readonly [MathOperation, DifficultyLevel, number, number][] = [
  ['addition', 1, 0, 0],
  ['addition', 1, 10, 10],
  ['addition', 2, 0, 0],
  ['addition', 2, 50, 50],
  ['addition', 3, 0, 0],
  ['addition', 3, 100, 100],
  ['addition', 4, 10, 10],
  ['addition', 4, 1000, 1000],
  ['subtraction', 1, 0, 0],
  ['subtraction', 1, 10, 0],
  ['subtraction', 2, 0, 0],
  ['subtraction', 2, 50, 0],
  ['subtraction', 3, 0, 0],
  ['subtraction', 3, 100, 0],
  ['subtraction', 4, 10, 10],
  ['subtraction', 4, 1000, 10],
  ['subtraction', 4, 1000, 1000],
  ['multiplication', 1, 0, 0],
  ['multiplication', 1, 5, 5],
  ['multiplication', 2, 0, 10],
  ['multiplication', 2, 10, 10],
  ['multiplication', 3, 0, 99],
  ['multiplication', 3, 9, 99],
  ['multiplication', 3, 99, 9],
  ['multiplication', 4, 10, 0],
  ['multiplication', 4, 0, 99],
  ['multiplication', 4, 99, 99],
  ['division', 1, 0, 1],
  ['division', 1, 25, 5],
  ['division', 1, 5, 1],
  ['division', 2, 0, 10],
  ['division', 2, 100, 10],
  ['division', 2, 10, 1],
  ['division', 3, 0, 1],
  ['division', 3, 144, 1],
  ['division', 3, 144, 12],
  ['division', 4, 145, 1],
  ['division', 4, 1000, 1],
  ['division', 4, 990, 99],
]
test.each(edges)(
  '%s Level %s edge %s and %s preserves bounds and avoids the original',
  (operation, difficulty, first, second) => {
    const original = makePattern(operation, first, second, difficulty)
    for (const draw of [0, 0.5, HIGH]) {
      const generate = createSimilarQuestionGenerator({ random: () => draw })
      const history: Question[] = []
      for (let index = 0; index < 8; index++) {
        const review = generate(original)
        expectRelated(review, original)
        // At these numeric boundaries the smallest candidate pool has five
        // facts, so its oldest fact returns after four other questions.
        expect(history.slice(-4).map(key)).not.toContain(key(review))
        history.push(review)
      }
      expectRelated(
        generateSimilarQuestion(original, {
          strategy: 'nearby',
          random: () => draw,
        }),
        original,
      )
    }
  },
)

test.each(
  operations.flatMap((operation) =>
    levels.map((difficulty) => ({ operation, difficulty })),
  ),
)(
  '$operation Level $difficulty has a valid related inverse family',
  ({ operation, difficulty }) => {
    const first =
      operation === 'addition'
        ? difficulty === 4
          ? 30
          : 3
        : operation === 'subtraction'
          ? difficulty === 4
            ? 30
            : 7
          : operation === 'multiplication'
            ? difficulty === 4
              ? 12
              : 3
            : difficulty === 4
              ? 156
              : 12
    const second =
      difficulty === 4
        ? operation === 'multiplication'
          ? 13
          : 12
        : operation === 'division'
          ? 3
          : 4
    const original = makePattern(operation, first, second, difficulty)
    for (const draw of [0, HIGH]) {
      const review = generateSimilarQuestion(original, {
        strategy: 'fact-family',
        random: () => draw,
      })
      expectRelated(review, original)
      if (draw === 0) expect(review.operation).not.toBe(operation)
      expect(
        review.operation === operation ||
          (['addition', 'subtraction'].includes(operation)
            ? ['addition', 'subtraction']
            : ['multiplication', 'division']
          ).includes(review.operation),
      ).toBe(true)
    }
  },
)
