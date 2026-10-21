import { expect, test } from 'vitest'
import { isValidPracticeConfiguration } from './practiceConfiguration'

const valid = {
  operations: ['addition', 'division'],
  difficulty: 2,
  sessionLength: 10,
}

test.each(['regular', 'mistake-review'])('accepts practice mode %s', (mode) => {
  expect(isValidPracticeConfiguration({ ...valid, mode })).toBe(true)
})
test.each(['other', null, 1])('rejects invalid practice mode %s', (mode) => {
  expect(isValidPracticeConfiguration({ ...valid, mode })).toBe(false)
})

test.each([5, 10, 20, 'continuous'])(
  'accepts a complete configuration with length %s',
  (sessionLength) => {
    expect(isValidPracticeConfiguration({ ...valid, sessionLength })).toBe(true)
  },
)

test.each([
  ['missing configuration', null],
  ['missing fields', {}],
  ['no operations', { ...valid, operations: [] }],
  ['sparse operations', { ...valid, operations: new Array(1) }],
  ['unsupported operation', { ...valid, operations: ['mixed'] }],
  ['duplicate operations', { ...valid, operations: ['addition', 'addition'] }],
  ['missing difficulty', { ...valid, difficulty: null }],
  ['unsupported difficulty', { ...valid, difficulty: 5 }],
  ['string difficulty', { ...valid, difficulty: '2' }],
  ['negative session length', { ...valid, sessionLength: -1 }],
  ['unsupported session length', { ...valid, sessionLength: 7 }],
  ['string session length', { ...valid, sessionLength: '10' }],
])('rejects %s', (_description, configuration) => {
  expect(isValidPracticeConfiguration(configuration)).toBe(false)
})
