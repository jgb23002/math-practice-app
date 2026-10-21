import { expect, test } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import { isMistakePattern, isMistakePatternHistory } from './storageValidation'

test.each([
  ['id', ''],
  ['id', '   '],
  ['id', 123],
  ['operation', 'power'],
  ['difficulty', 0],
  ['difficulty', 5],
  ['firstOperand', -1],
  ['firstOperand', 1000],
  ['firstOperand', 0.5],
  ['secondOperand', null],
  ['secondOperand', Infinity],
  ['correctAnswer', 8],
  ['correctAnswer', NaN],
  ['lastIncorrectAt', 'yesterday'],
  ['lastIncorrectAt', '2026-02-30T00:00:00.000Z'],
  ['incorrectCount', 0],
  ['incorrectCount', -1],
  ['incorrectCount', 1.5],
  ['incorrectCount', Number.MAX_SAFE_INTEGER + 1],
  ['similarCorrectCount', -1],
  ['similarCorrectCount', '2'],
  ['similarCorrectCount', 0.5],
  ['similarCorrectCount', Number.MAX_SAFE_INTEGER + 1],
  ['mastered', 'false'],
  ['mastered', null],
])('rejects malformed mistake field %s = %j', (field, value) => {
  expect(isMistakePattern({ ...createMistakePattern(), [field]: value })).toBe(
    false,
  )
})

test('requires every model field and rejects non-record values', () => {
  for (const value of [null, undefined, [], {}, 1, 'pattern'])
    expect(isMistakePattern(value)).toBe(false)
  for (const key of Object.keys(createMistakePattern())) {
    const incomplete: Record<string, unknown> = { ...createMistakePattern() }
    delete incomplete[key]
    expect(isMistakePattern(incomplete), `missing ${key}`).toBe(false)
  }
})

test.each([
  {
    operation: 'division',
    firstOperand: 8,
    secondOperand: 0,
    correctAnswer: 0,
  },
  {
    operation: 'division',
    firstOperand: 7,
    secondOperand: 2,
    correctAnswer: 3.5,
  },
  {
    operation: 'division',
    firstOperand: 100,
    secondOperand: 2,
    correctAnswer: 50,
  },
  {
    operation: 'subtraction',
    firstOperand: 3,
    secondOperand: 4,
    correctAnswer: -1,
  },
  {
    operation: 'multiplication',
    firstOperand: 6,
    secondOperand: 6,
    correctAnswer: 36,
  },
  {
    operation: 'addition',
    firstOperand: 11,
    secondOperand: 1,
    correctAnswer: 12,
  },
])('rejects invalid arithmetic and difficulty boundaries: %j', (overrides) => {
  expect(isMistakePattern({ ...createMistakePattern(), ...overrides })).toBe(
    false,
  )
})

test('validates unique IDs and fact keys, including sparse/invalid collections', () => {
  const pattern = createMistakePattern()
  expect(isMistakePatternHistory([])).toBe(true)
  expect(isMistakePatternHistory([pattern])).toBe(true)
  expect(
    isMistakePatternHistory([pattern, { ...pattern, difficulty: 2 }]),
  ).toBe(false)
  expect(isMistakePatternHistory([pattern, { ...pattern, id: 'other' }])).toBe(
    false,
  )
  for (const value of [
    null,
    {},
    Array(1),
    [null],
    [pattern, { invalid: true }],
  ])
    expect(isMistakePatternHistory(value)).toBe(false)
  expect(
    isMistakePatternHistory([
      pattern,
      { ...pattern, id: 'other', difficulty: 2 },
    ]),
  ).toBe(true)
})

test('preserves stored mastery without assuming the current configurable threshold', () => {
  expect(
    isMistakePattern(
      createMistakePattern({ mastered: true, similarCorrectCount: 5 }),
    ),
  ).toBe(true)
})
