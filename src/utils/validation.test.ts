import { expect, test } from 'vitest'
import type {
  ArithmeticQuestion,
  DifficultyLevel,
  MathOperation,
} from '../types/question'
import {
  getArithmeticQuestionErrors,
  isValidArithmeticQuestion,
} from './validation'

const symbols = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}
function fixture(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  first: number,
  second: number,
  answer: number,
): ArithmeticQuestion {
  return {
    id: 'fixture',
    operation,
    difficulty,
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
    displayText: `${first} ${symbols[operation]} ${second} = ?`,
    source: 'regular',
  }
}

const boundaryFixtures = [
  ['addition', 1, 10, 10, 20],
  ['addition', 2, 50, 50, 100],
  ['addition', 3, 100, 100, 200],
  ['addition', 4, 1000, 1000, 2000],
  ['subtraction', 1, 10, 0, 10],
  ['subtraction', 2, 50, 0, 50],
  ['subtraction', 3, 100, 0, 100],
  ['subtraction', 4, 1000, 10, 990],
  ['multiplication', 1, 5, 5, 25],
  ['multiplication', 2, 10, 10, 100],
  ['multiplication', 3, 9, 99, 891],
  ['multiplication', 4, 99, 99, 9801],
  ['division', 1, 25, 5, 5],
  ['division', 2, 100, 10, 10],
  ['division', 3, 144, 12, 12],
  ['division', 4, 1000, 1, 1000],
] as const

test.each(boundaryFixtures)(
  'accepts valid %s Level %s boundary arithmetic',
  (operation, difficulty, first, second, answer) => {
    expect(
      isValidArithmeticQuestion(
        fixture(operation, difficulty, first, second, answer),
      ),
    ).toBe(true)
  },
)

test.each([
  ['addition', 1, 11, 0, 11],
  ['addition', 2, 51, 0, 51],
  ['addition', 3, 101, 0, 101],
  ['addition', 4, 1001, 10, 1011],
  ['subtraction', 1, 11, 1, 10],
  ['subtraction', 2, 51, 1, 50],
  ['subtraction', 3, 101, 1, 100],
  ['subtraction', 4, 1001, 10, 991],
  ['multiplication', 1, 6, 1, 6],
  ['multiplication', 2, 11, 1, 11],
  ['multiplication', 3, 10, 10, 100],
  ['multiplication', 4, 9, 9, 81],
  ['division', 1, 6, 6, 1],
  ['division', 2, 11, 11, 1],
  ['division', 3, 13, 13, 1],
  ['division', 4, 200, 100, 2],
] as const)(
  'rejects mathematically correct %s Level %s outside its allowed range',
  (operation, difficulty, first, second, answer) => {
    expect(
      isValidArithmeticQuestion(
        fixture(operation, difficulty, first, second, answer),
      ),
    ).toBe(false)
  },
)

test('enforces dividend caps, documented quotient defaults, and the advanced lower bound', () => {
  for (const question of [
    fixture('division', 1, 6, 1, 6),
    fixture('division', 2, 11, 1, 11),
    fixture('division', 3, 145, 1, 145),
    fixture('division', 4, 144, 1, 144),
    fixture('division', 4, 1001, 1, 1001),
    fixture('addition', 4, 9, 10, 19),
    fixture('subtraction', 4, 10, 9, 1),
  ])
    expect(isValidArithmeticQuestion(question)).toBe(false)
})

test('accepts reversed factors in the same multiplication family', () => {
  expect(
    isValidArithmeticQuestion(fixture('multiplication', 3, 99, 9, 891)),
  ).toBe(true)
  expect(
    isValidArithmeticQuestion(fixture('multiplication', 4, 9, 99, 891)),
  ).toBe(true)
})

function expectRejected(question: unknown, label: string) {
  const context = `${label}\nquestion=${JSON.stringify(
    question,
    (_key, value: unknown) =>
      typeof value === 'number' && !Number.isFinite(value)
        ? String(value)
        : value,
  )}`
  let errors: string[]
  try {
    errors = getArithmeticQuestionErrors(question)
  } catch (cause) {
    throw new Error(
      `Validation must reject malformed data without throwing.\n${context}`,
      { cause },
    )
  }
  expect(errors.length, context).toBeGreaterThan(0)
  expect(
    errors.every(
      (error) => typeof error === 'string' && error.trim().length > 0,
    ),
    context,
  ).toBe(true)
  expect(isValidArithmeticQuestion(question), context).toBe(false)
}

test.each([1, 2, 3, 4] as const)(
  'Level %s rejects zero divisors, fractional or rounded quotients, and invalid subtraction',
  (difficulty) => {
    const dividend = difficulty === 4 ? 145 : 1
    const zeroDivisor = fixture('division', difficulty, dividend, 0, 0)
    expect(getArithmeticQuestionErrors(zeroDivisor)).toContain(
      'Division by zero is forbidden.',
    )
    expectRejected(zeroDivisor, `Level ${difficulty} zero divisor`)
    expectRejected(
      fixture('division', difficulty, 0, 0, 0),
      `Level ${difficulty} zero divided by zero`,
    )
    expectRejected(
      fixture('division', difficulty, dividend, 2, dividend / 2),
      `Level ${difficulty} fractional quotient`,
    )
    expectRejected(
      fixture('division', difficulty, dividend, 2, Math.floor(dividend / 2)),
      `Level ${difficulty} truncated quotient`,
    )
    expectRejected(
      fixture('division', difficulty, dividend, 2, Math.ceil(dividend / 2)),
      `Level ${difficulty} rounded quotient`,
    )
    const smaller = difficulty === 4 ? 10 : 0
    const larger = [10, 50, 100, 1000][difficulty - 1]
    expectRejected(
      fixture('subtraction', difficulty, smaller, larger, smaller - larger),
      `Level ${difficulty} negative subtraction`,
    )
    expectRejected(
      fixture('subtraction', difficulty, smaller, larger, larger - smaller),
      `Level ${difficulty} incorrect absolute difference`,
    )
  },
)

test.each(boundaryFixtures)(
  '%s Level %s rejects each missing required field and an incorrect answer',
  (operation, difficulty, first, second, answer) => {
    const valid = fixture(operation, difficulty, first, second, answer)
    for (const field of [
      'id',
      'operation',
      'difficulty',
      'firstOperand',
      'secondOperand',
      'correctAnswer',
      'displayText',
      'source',
    ]) {
      const incomplete: Record<string, unknown> = { ...valid }
      delete incomplete[field]
      expectRejected(
        incomplete,
        `${operation} Level ${difficulty}, missing ${field}`,
      )
    }
    expectRejected(
      { ...valid, correctAnswer: answer + 1 },
      `${operation} Level ${difficulty}, incorrect answer`,
    )
  },
)

const malformedFields = [
  ['id', ['', ' ', null, undefined, 42, {}, []]],
  [
    'operation',
    ['power', 'mixed', 'constructor', '__proto__', 'toString', null, 1, {}, []],
  ],
  ['difficulty', [0, -1, 5, 1.5, '1', NaN, Infinity, null, {}, []]],
  ...(['firstOperand', 'secondOperand', 'correctAnswer'] as const).map(
    (field) =>
      [
        field,
        [
          -1,
          -0.5,
          0.5,
          NaN,
          Infinity,
          -Infinity,
          Number.MAX_SAFE_INTEGER + 1,
          '7',
          null,
          undefined,
          {},
          [],
        ],
      ] as const,
  ),
  ['displayText', ['', 'wrong question', 42, null, undefined, {}, []]],
  ['source', ['', 'unknown', 'review', 42, null, undefined, {}, []]],
  ['mistakePatternId', ['', ' ', 42, null, {}, []]],
] as const

test.each(boundaryFixtures)(
  '%s Level %s rejects malformed values for every arithmetic field',
  (operation, difficulty, first, second, answer) => {
    const valid = fixture(operation, difficulty, first, second, answer)
    for (const [field, invalidValues] of malformedFields) {
      for (const value of invalidValues) {
        expectRejected(
          { ...valid, [field]: value },
          `${operation} Level ${difficulty}, ${field}=${String(value)}`,
        )
      }
    }
    expectRejected(
      { ...valid, source: 'mistake-review' },
      `${operation} Level ${difficulty}, review without a pattern`,
    )
    for (const mistakePatternId of ['', ' ', null, 42])
      expectRejected(
        { ...valid, source: 'mistake-review', mistakePatternId },
        `${operation} Level ${difficulty}, malformed review pattern`,
      )
  },
)

test.each(
  [
    undefined,
    null,
    false,
    true,
    0,
    'question',
    [],
    [1, 2],
    {},
    new Date(0),
    new Map(),
    new Set(),
    Object.create(null),
    () => ({}),
  ].map((question, index) => ({ question, index })),
)('rejects malformed top-level value $index', ({ question, index }) =>
  expectRejected(question, `Malformed top-level value ${index}`),
)

const valid = fixture('addition', 1, 3, 4, 7)
test.each(
  [
    null,
    [],
    {},
    { ...valid, id: '' },
    { ...valid, id: 42 },
    { ...valid, operation: 'constructor' },
    { ...valid, difficulty: '1' },
    { ...valid, firstOperand: NaN },
    { ...valid, secondOperand: Infinity },
    { ...valid, correctAnswer: 8 },
    { ...valid, correctAnswer: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, displayText: '3 + 4 = 8' },
    { ...valid, source: 'unknown' },
    { ...valid, source: 'mistake-review' },
    { ...valid, mistakePatternId: ' ' },
  ].map((question) => ({ question })),
)('rejects malformed arithmetic data $question', ({ question }) => {
  expect(isValidArithmeticQuestion(question)).toBe(false)
})

test('validates review metadata without implementing review generation', () => {
  expect(
    isValidArithmeticQuestion({
      ...valid,
      source: 'mistake-review',
      mistakePatternId: 'pattern-1',
    }),
  ).toBe(true)
})
