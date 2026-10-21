import { expect, test, vi } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import type { MistakePattern } from '../types/mistake'
import type { MathOperation, Question } from '../types/question'
import { isValidQuestion } from '../utils/validation'
import {
  createSimilarQuestionGenerator,
  generateSimilarQuestion,
  SimilarQuestionGenerationError,
  type SimilarQuestionOptions,
} from './similarQuestionGenerator'

const HIGH = 1 - Number.EPSILON

test('session operation restrictions filter related inverse questions without changing difficulty', () => {
  const original = createMistakePattern()
  for (const allowedOperations of [['addition'], ['subtraction']] as const) {
    for (let index = 0; index < 10; index++) {
      const question = generateSimilarQuestion(original, { allowedOperations })
      expect(allowedOperations).toContain(question.operation)
      expect(question.difficulty).toBe(original.difficulty)
    }
  }
  for (const allowedOperations of [
    [],
    ['power'],
    ['addition', 'addition'],
    Array(1),
  ])
    expect(() =>
      generateSimilarQuestion(original, {
        allowedOperations: allowedOperations as MathOperation[],
      }),
    ).toThrow(TypeError)
})
function pattern(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
  difficulty: MistakePattern['difficulty'] = 1,
) {
  return createMistakePattern({
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    difficulty,
  })
}
function fact(
  question: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
) {
  return [
    question.operation,
    question.firstOperand,
    question.secondOperand,
  ].join(':')
}
function expectReview(question: Question, original: MistakePattern) {
  expect(isValidQuestion(question)).toBe(true)
  expect(question.source).toBe('mistake-review')
  expect(question.mistakePatternId).toBe(original.id)
  expect(question.difficulty).toBe(original.difficulty)
  expect(fact(question)).not.toBe(fact(original))
  expect(question.choices).toHaveLength(4)
  expect(new Set(question.choices).size).toBe(4)
  expect(
    question.choices.filter((answer) => answer === question.correctAnswer),
  ).toHaveLength(1)
}

test.each([
  pattern('addition', 3, 4, 7),
  pattern('multiplication', 8, 7, 56, 2),
])('reverses $operation operands while preserving the answer', (original) => {
  const question = generateSimilarQuestion(original, { strategy: 'reversed' })
  expect([
    question.operation,
    question.firstOperand,
    question.secondOperand,
    question.correctAnswer,
  ]).toEqual([
    original.operation,
    original.secondOperand,
    original.firstOperand,
    original.correctAnswer,
  ])
  expectReview(question, original)
})

test.each([
  {
    original: pattern('addition', 3, 4, 7),
    facts: ['subtraction:7:3', 'subtraction:7:4'],
  },
  {
    original: pattern('subtraction', 7, 3, 4),
    facts: ['addition:3:4', 'addition:4:3', 'subtraction:7:4'],
  },
  {
    original: pattern('multiplication', 8, 7, 56, 2),
    facts: ['division:56:8', 'division:56:7'],
  },
  {
    original: pattern('division', 56, 7, 8, 2),
    facts: ['multiplication:7:8', 'multiplication:8:7', 'division:56:8'],
  },
])(
  'generates the complete fact family for $original.operation',
  ({ original, facts }) => {
    const generated = new Set<string>()
    for (const draw of [0, 0.5, HIGH]) {
      const question = generateSimilarQuestion(original, {
        strategy: 'fact-family',
        random: () => draw,
      })
      expectReview(question, original)
      generated.add(fact(question))
    }
    expect(generated).toEqual(new Set(facts))
  },
)

test.each([
  pattern('addition', 3, 4, 7),
  pattern('subtraction', 7, 3, 4),
  pattern('multiplication', 8, 7, 56, 2),
])('nearby $operation changes operands by at most two', (original) => {
  for (const draw of [0, 0.5, HIGH]) {
    const question = generateSimilarQuestion(original, {
      strategy: 'nearby',
      random: () => draw,
    })
    expectReview(question, original)
    expect(question.operation).toBe(original.operation)
    expect(
      Math.abs(question.firstOperand - original.firstOperand),
    ).toBeLessThanOrEqual(2)
    expect(
      Math.abs(question.secondOperand - original.secondOperand),
    ).toBeLessThanOrEqual(2)
  }
})

test('nearby division varies dividends or forms exact neighboring quotient/divisor facts', () => {
  const original = pattern('division', 56, 7, 8, 2)
  for (const draw of [0, 0.25, 0.5, 0.75, HIGH]) {
    const question = generateSimilarQuestion(original, {
      strategy: 'nearby',
      random: () => draw,
    })
    expectReview(question, original)
    expect(question.operation).toBe('division')
    expect(question.secondOperand).toBeGreaterThan(0)
    expect(question.firstOperand % question.secondOperand).toBe(0)
    expect(
      Math.abs(question.secondOperand - original.secondOperand),
    ).toBeLessThanOrEqual(2)
    expect(
      Math.abs(question.firstOperand - original.firstOperand) <= 2 ||
        Math.abs(question.correctAnswer - original.correctAnswer) <= 2,
    ).toBe(true)
  }
})

test.each([
  pattern('subtraction', 7, 3, 4),
  pattern('division', 8, 2, 4),
  pattern('addition', 3, 3, 6),
  pattern('multiplication', 3, 3, 9),
])(
  'does not invent a reversed question for $operation $firstOperand and $secondOperand',
  (original) => {
    expect(() =>
      generateSimilarQuestion(original, { strategy: 'reversed' }),
    ).toThrow(SimilarQuestionGenerationError)
    expectReview(generateSimilarQuestion(original), original)
  },
)

test.each([
  pattern('addition', 10, 10, 20),
  pattern('addition', 100, 100, 200, 3),
  pattern('subtraction', 10, 10, 0, 4),
  pattern('multiplication', 0, 0, 0),
  pattern('multiplication', 9, 99, 891, 3),
  pattern('multiplication', 99, 99, 9801, 4),
  pattern('division', 144, 12, 12, 3),
  pattern('division', 145, 1, 145, 4),
])(
  'rejects an unavailable fact family within Level $difficulty for $operation $firstOperand and $secondOperand',
  (original) => {
    let failure: unknown
    try {
      generateSimilarQuestion(original, { strategy: 'fact-family' })
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(SimilarQuestionGenerationError)
    expect(failure).toMatchObject({
      attempts: 0,
      cause: expect.any(RangeError),
    })
    expectReview(generateSimilarQuestion(original), original)
  },
)

test('keeps the valid inverse when the other family member exceeds the divisor limit', () => {
  const original = pattern('multiplication', 9, 16, 144, 3)
  const question = generateSimilarQuestion(original, {
    strategy: 'fact-family',
  })
  expect(fact(question)).toBe('division:144:9')
  expect(question.correctAnswer).toBe(16)
  expectReview(question, original)
})

test.each([
  { original: pattern('addition', 0, 0, 0), facts: ['subtraction:0:0'] },
  { original: pattern('subtraction', 0, 0, 0), facts: ['addition:0:0'] },
  { original: pattern('multiplication', 0, 5, 0), facts: ['division:0:5'] },
  {
    original: pattern('division', 0, 2, 0),
    facts: ['multiplication:2:0', 'multiplication:0:2'],
  },
])(
  'handles zero in the $original.operation fact family without zero divisors',
  ({ original, facts }) => {
    for (const draw of [0, HIGH]) {
      const question = generateSimilarQuestion(original, {
        strategy: 'fact-family',
        random: () => draw,
      })
      expect(facts).toContain(fact(question))
      expectReview(question, original)
    }
  },
)

test('remembers arithmetic facts rather than question IDs or answer-choice order', () => {
  const original = createMistakePattern()
  const first = generateSimilarQuestion(original, { random: () => 0 })
  const recent = [
    {
      ...first,
      id: 'a-different-question-id',
      choices: [...first.choices].reverse(),
    },
  ]
  const next = generateSimilarQuestion(original, {
    random: () => 0,
    recentQuestions: recent,
  })
  expect(fact(next)).not.toBe(fact(first))
  expectReview(next, original)
})

test('an instance avoids its last five facts even with constant randomness and uses unique IDs', () => {
  const generate = createSimilarQuestionGenerator({ random: () => 0 })
  const original = createMistakePattern()
  const history: Question[] = []
  for (let index = 0; index < 50; index++) {
    const question = generate(original)
    expect(history.slice(-5).map(fact)).not.toContain(fact(question))
    expect(history.map((item) => item.id)).not.toContain(question.id)
    expectReview(question, original)
    history.push(question)
  }
})

test('small candidate pools reuse the least recently seen fact instead of looping or relaxing bounds', () => {
  const original = createMistakePattern()
  const generate = createSimilarQuestionGenerator({
    strategy: 'fact-family',
    random: () => 0,
  })
  const questions = Array.from({ length: 12 }, () => generate(original))
  expect(new Set(questions.map(fact)).size).toBe(2)
  for (let index = 1; index < questions.length; index++) {
    expect(fact(questions[index])).not.toBe(fact(questions[index - 1]))
    expectReview(questions[index], original)
  }
  const reverse = createSimilarQuestionGenerator({
    strategy: 'reversed',
    random: () => 0,
  })
  expect(fact(reverse(original))).toBe(fact(reverse(original)))
})

test('history is bounded, belongs to each instance, and snapshots returned questions and seed data', () => {
  const original = createMistakePattern()
  const first = generateSimilarQuestion(original, { random: () => 0 })
  const unrelated = Array.from({ length: 5 }, (_, index) => ({
    operation: 'addition' as const,
    difficulty: 4 as const,
    firstOperand: 50 + index,
    secondOperand: 30,
  }))
  expect(
    fact(
      generateSimilarQuestion(original, {
        random: () => 0,
        recentQuestions: [first, ...unrelated],
      }),
    ),
  ).toBe(fact(first))
  const seed = { ...first }
  const generate = createSimilarQuestionGenerator({
    random: () => 0,
    recentQuestions: [seed],
  })
  seed.firstOperand = 1000
  const next = generate(original)
  expect(fact(next)).not.toBe(fact(first))
  const savedFact = fact(next)
  next.firstOperand = 1000
  expect(fact(generate(original))).not.toBe(savedFact)
  const independent = createSimilarQuestionGenerator({ random: () => 0 })
  expect(fact(independent(original))).toBe(fact(first))
})

test('does not mutate the mistake, recent questions, or options', () => {
  const original = Object.freeze(createMistakePattern())
  const recent = Object.freeze([
    Object.freeze(generateSimilarQuestion(original)),
  ])
  const options = Object.freeze({ recentQuestions: recent, random: () => 0.5 })
  const before = JSON.stringify({ original, recent })
  expectReview(generateSimilarQuestion(original, options), original)
  expect(JSON.stringify({ original, recent })).toBe(before)
})

test.each(
  [
    null,
    undefined,
    [],
    {},
    { ...createMistakePattern(), id: '' },
    { ...createMistakePattern(), difficulty: 5 },
    { ...createMistakePattern(), incorrectCount: 0 },
    { ...createMistakePattern(), correctAnswer: 8 },
    { ...createMistakePattern(), operation: 'power' },
    pattern('subtraction', 3, 4, -1),
    pattern('division', 8, 0, 0),
    pattern('division', 7, 2, 3.5),
  ].map((original) => ({ original })),
)('rejects malformed patterns before randomness: $original', ({ original }) => {
  const random = vi.fn(() => 0)
  expect(() =>
    generateSimilarQuestion(original as MistakePattern, { random }),
  ).toThrow(TypeError)
  expect(random).not.toHaveBeenCalled()
})

test.each(
  [
    null,
    [],
    'options',
    { strategy: 'other' },
    { random: 1 },
    { createId: null },
    { maxAttempts: 0 },
    { maxAttempts: 11 },
    { maxAttempts: 1.5 },
    { maxAttempts: Infinity },
    { recentQuestions: null },
    { recentQuestions: Array(1) },
    { recentQuestions: [{}] },
    {
      recentQuestions: [
        {
          operation: 'addition',
          firstOperand: -1,
          secondOperand: 2,
          difficulty: 1,
        },
      ],
    },
  ].map((options) => ({ options })),
)('rejects malformed options: $options', ({ options }) => {
  expect(() =>
    generateSimilarQuestion(
      createMistakePattern(),
      options as SimilarQuestionOptions,
    ),
  ).toThrow()
  expect(() =>
    createSimilarQuestionGenerator(options as SimilarQuestionOptions),
  ).toThrow()
})

test.each([NaN, Infinity, -1, 1])(
  'bounds invalid randomness %s and retains its cause',
  (value) => {
    const random = vi.fn(() => value)
    let failure: unknown
    try {
      generateSimilarQuestion(createMistakePattern(), { random })
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(SimilarQuestionGenerationError)
    expect(failure).toMatchObject({
      attempts: 3,
      cause: expect.any(RangeError),
    })
    expect(random).toHaveBeenCalledTimes(3)
  },
)

test('retries malformed IDs and bounds ID source failures', () => {
  const original = createMistakePattern()
  const createId = vi
    .fn()
    .mockReturnValueOnce(' ')
    .mockReturnValue('valid-review-id')
  expect(generateSimilarQuestion(original, { createId }).id).toBe(
    'valid-review-id',
  )
  expect(createId).toHaveBeenCalledTimes(2)
  const cause = new Error('ID unavailable')
  const failingId = vi.fn(() => {
    throw cause
  })
  let failure: unknown
  try {
    generateSimilarQuestion(original, { createId: failingId, maxAttempts: 2 })
  } catch (error) {
    failure = error
  }
  expect(failure).toMatchObject({ attempts: 2, cause })
  expect(failingId).toHaveBeenCalledTimes(2)
})

test('bounds answer-choice failures and does not advance instance history after failed generation', () => {
  let draw = 0
  const random = vi.fn(() => [0, 0, NaN][draw++ % 3])
  expect(() =>
    generateSimilarQuestion(createMistakePattern(), { random, maxAttempts: 2 }),
  ).toThrow(SimilarQuestionGenerationError)
  expect(random).toHaveBeenCalledTimes(6)
  const generate = createSimilarQuestionGenerator({
    random: () => 0,
    maxAttempts: 1,
    createId: vi.fn().mockReturnValueOnce('').mockReturnValue('valid-id'),
  })
  expect(() => generate(createMistakePattern())).toThrow(
    SimilarQuestionGenerationError,
  )
  expect(fact(generate(createMistakePattern()))).toBe(
    fact(generateSimilarQuestion(createMistakePattern(), { random: () => 0 })),
  )
})
