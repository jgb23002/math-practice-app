import { expect, test, vi } from 'vitest'
import type {
  ArithmeticQuestion,
  DifficultyLevel,
  MathOperation,
} from '../types/question'
import {
  generateAnswerChoices,
  generateDistractors,
  type AnswerChoiceOptions,
} from './answerChoices'

const symbols = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}
function core(
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

const edgeCases = [
  ['addition', 1, 0, 0, 0],
  ['addition', 1, 1, 0, 1],
  ['addition', 1, 1, 1, 2],
  ['subtraction', 1, 1, 1, 0],
  ['subtraction', 1, 1, 0, 1],
  ['subtraction', 1, 2, 0, 2],
  ['multiplication', 1, 0, 0, 0],
  ['multiplication', 1, 0, 5, 0],
  ['multiplication', 1, 1, 1, 1],
  ['multiplication', 1, 1, 2, 2],
  ['division', 1, 0, 1, 0],
  ['division', 1, 1, 1, 1],
  ['division', 1, 2, 1, 2],
  ['division', 1, 2, 2, 1],
  ['addition', 4, 1000, 1000, 2000],
  ['subtraction', 4, 1000, 10, 990],
  ['multiplication', 4, 99, 99, 9801],
  ['multiplication', 4, 99, 0, 0],
  ['division', 3, 144, 12, 12],
  ['division', 4, 1000, 1, 1000],
  ['division', 4, 145, 5, 29],
  ['division', 4, 147, 49, 3],
  ['division', 4, 198, 99, 2],
] as const

test.each(edgeCases)(
  '%s Level %s: %s and %s produce four valid options for answer %s',
  (operation, difficulty, first, second, answer) => {
    const question = Object.freeze(
      core(operation, difficulty, first, second, answer),
    )
    for (const draw of [0, 0.5, 1 - Number.EPSILON]) {
      const choices = generateAnswerChoices(question, { random: () => draw })
      const context = JSON.stringify({ question, draw, choices })
      expect(choices, context).toHaveLength(4)
      expect(new Set(choices).size, context).toBe(4)
      expect(
        choices.filter((choice) => choice === answer),
        context,
      ).toHaveLength(1)
      expect(
        choices.every((choice) => Number.isSafeInteger(choice) && choice >= 0),
        context,
      ).toBe(true)
      expect(question).not.toHaveProperty('choices')
    }
  },
)

test.each([
  ['addition', 2, 27, 18, 45, [35, 55]],
  ['subtraction', 3, 52, 19, 33, [43, 23]],
  ['multiplication', 2, 8, 7, 56, [49, 63]],
  ['division', 2, 56, 7, 8, [7, 9]],
] as const)(
  '%s uses operation-specific common mistakes',
  (operation, difficulty, first, second, answer, mistakes) => {
    const distractors = generateDistractors(
      core(operation, difficulty, first, second, answer),
      { random: () => 0, maxAttempts: 1 },
    )
    expect(distractors).toEqual(expect.arrayContaining([...mistakes]))
    expect(distractors).not.toContain(answer)
  },
)

test.each(['addition', 'subtraction', 'multiplication', 'division'] as const)(
  '%s with answer zero has nearby distractors 1, 2, and 3',
  (operation) => {
    const question = core(operation, 1, 0, operation === 'division' ? 1 : 0, 0)
    expect(generateDistractors(question, { random: () => 0 })).toEqual(
      expect.arrayContaining([1, 2, 3]),
    )
  },
)

test('repeated random values exhaust a fixed budget then use a finite fallback', () => {
  let calls = 0
  const random = () => {
    if (++calls > 20)
      throw new Error(
        'Choice generation exceeded its bounded random-draw budget.',
      )
    return 0
  }
  const choices = generateAnswerChoices(core('multiplication', 1, 0, 0, 0), {
    random,
  })
  expect(new Set(choices)).toEqual(new Set([0, 1, 2, 3]))
  expect(calls).toBeLessThanOrEqual(15)
})

test.each([1, 32])(
  'honors a distractor attempt budget of %s even with repeated draws',
  (maxAttempts) => {
    const random = vi.fn(() => 0)
    const distractors = generateDistractors(core('addition', 1, 0, 0, 0), {
      random,
      maxAttempts,
    })
    expect(new Set(distractors)).toEqual(new Set([1, 2, 3]))
    expect(random).toHaveBeenCalledTimes(maxAttempts)
  },
)

test.each([
  core('multiplication', 3, 0, 99, 0),
  core('multiplication', 4, 99, 0, 0),
])('zero times a large factor keeps distractors near zero: %j', (question) => {
  expect(new Set(generateDistractors(question, { random: () => 0 }))).toEqual(
    new Set([1, 2, 3]),
  )
})

test.each([null, [], { random: 42 }])(
  'rejects malformed choice-generation options %j',
  (options) => {
    expect(() =>
      generateAnswerChoices(
        core('addition', 1, 1, 2, 3),
        options as AnswerChoiceOptions,
      ),
    ).toThrow(TypeError)
  },
)

test.each([0, -1, 33, 1.5, NaN, Infinity])(
  'rejects invalid distractor retry count %s before using randomness',
  (maxAttempts) => {
    const random = vi.fn(() => 0)
    expect(() =>
      generateDistractors(core('addition', 1, 1, 2, 3), {
        random,
        maxAttempts,
      }),
    ).toThrow(RangeError)
    expect(random).not.toHaveBeenCalled()
  },
)

test.each([-0.1, 1, NaN, Infinity])(
  'rejects invalid random output %s',
  (value) => {
    const random = vi.fn(() => value)
    expect(() =>
      generateAnswerChoices(core('division', 1, 4, 2, 2), { random }),
    ).toThrow(RangeError)
    expect(random).toHaveBeenCalledOnce()
  },
)

test('propagates unexpected random-source errors without retrying indefinitely', () => {
  const cause = new Error('Random source failed')
  const random = vi.fn(() => {
    throw cause
  })
  expect(() =>
    generateAnswerChoices(core('addition', 1, 1, 2, 3), { random }),
  ).toThrow(cause)
  expect(random).toHaveBeenCalledOnce()
})

test.each([
  null,
  [],
  { correctAnswer: 0 },
  { ...core('addition', 1, 1, 2, 3), correctAnswer: 4 },
])('rejects an invalid arithmetic core %j', (question) => {
  const random = vi.fn(() => 0)
  expect(() =>
    generateAnswerChoices(question as ArithmeticQuestion, { random }),
  ).toThrow(TypeError)
  expect(random).not.toHaveBeenCalled()
})

test('the correct answer reaches every position for an unchanged question', () => {
  let state = 42
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 2 ** 32
  }
  const question = core('multiplication', 2, 8, 7, 56)
  const positions = new Set<number>()
  const orders = new Set<string>()
  for (let sample = 0; sample < 512; sample++) {
    const choices = generateAnswerChoices(question, { random })
    positions.add(choices.indexOf(question.correctAnswer))
    orders.add(choices.join(','))
  }
  expect(
    positions,
    'Fixed multiplication question, seed=42, samples=512',
  ).toEqual(new Set([0, 1, 2, 3]))
  expect(orders.size).toBeGreaterThan(4)
})
