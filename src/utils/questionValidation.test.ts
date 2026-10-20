import { expect, test } from 'vitest'
import type { Question } from '../types/question'
import {
  getQuestionErrors,
  isValidArithmeticQuestion,
  isValidQuestion,
} from './validation'

const question: Question = {
  id: 'question',
  operation: 'addition',
  difficulty: 1,
  firstOperand: 3,
  secondOperand: 4,
  correctAnswer: 7,
  displayText: '3 + 4 = ?',
  source: 'regular',
  choices: [6, 7, 8, 9],
}

test('validates all four choices together with the arithmetic core', () => {
  expect(getQuestionErrors(question)).toEqual([])
  expect(isValidQuestion(question)).toBe(true)
  expect(isValidQuestion({ ...question, choices: [0, 7, 8, 9] })).toBe(true)
  expect(
    isValidQuestion({
      ...question,
      source: 'mistake-review',
      mistakePatternId: 'pattern',
    }),
  ).toBe(true)
  const core: Partial<Question> = { ...question }
  delete core.choices
  expect(isValidArithmeticQuestion(core)).toBe(true)
  expect(isValidQuestion(core)).toBe(false)
})

const sparse = [6, 7, 8, 9]
delete sparse[0]
test.each([
  ['missing choices', undefined],
  ['null choices', null],
  ['non-array', {}],
  ['empty array', []],
  ['three choices', [6, 7, 8]],
  ['five choices', [5, 6, 7, 8, 9]],
  ['duplicate correct', [7, 7, 8, 9]],
  ['duplicate incorrect', [6, 7, 8, 8]],
  ['no correct answer', [3, 4, 5, 6]],
  ['negative choice', [-1, 7, 8, 9]],
  ['fraction', [6.5, 7, 8, 9]],
  ['NaN', [NaN, 7, 8, 9]],
  ['infinity', [Infinity, 7, 8, 9]],
  ['unsafe integer', [Number.MAX_SAFE_INTEGER + 1, 7, 8, 9]],
  ['string', ['6', 7, 8, 9]],
  ['null element', [null, 7, 8, 9]],
  ['undefined element', [undefined, 7, 8, 9]],
  ['boolean', [false, 7, 8, 9]],
  ['sparse array', sparse],
  ['empty sparse array', new Array(4)],
] as const)('rejects malformed answer choices: %s', (_label, choices) => {
  const malformed = { ...question, choices }
  expect(isValidQuestion(malformed)).toBe(false)
  expect(getQuestionErrors(malformed).length).toBeGreaterThan(0)
})

test.each([
  { correctAnswer: 8 },
  { firstOperand: -1 },
  { secondOperand: 11 },
  { displayText: '3 + 4 = 7' },
  { id: '' },
  { operation: 'power' },
  { difficulty: 5 },
  { source: 'unknown' },
])(
  'valid choices cannot hide malformed arithmetic or metadata: %j',
  (changes) => {
    expect(isValidQuestion({ ...question, ...changes })).toBe(false)
  },
)

test.each([undefined, null, [], {}, 'question'])(
  'rejects malformed top-level value %j without throwing',
  (value) => {
    expect(isValidQuestion(value)).toBe(false)
    expect(getQuestionErrors(value).length).toBeGreaterThan(0)
  },
)
