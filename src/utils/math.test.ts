import { expect, test, vi } from 'vitest'
import { randomInt } from './math'

test('includes both integer endpoints and supports negative ranges', () => {
  expect(randomInt(0, 10, () => 0)).toBe(0)
  expect(randomInt(0, 10, () => 1 - Number.EPSILON)).toBe(10)
  expect(randomInt(-5, 5, () => 0.5)).toBe(0)
})

test('maps equal-size random intervals to each integer', () => {
  expect(
    [0, 0.25, 0.5, 0.75].map((value) => randomInt(2, 5, () => value)),
  ).toEqual([2, 3, 4, 5])
})

test('does not need randomness for a singleton range', () => {
  const random = vi.fn()
  expect(randomInt(4, 4, random)).toBe(4)
  expect(random).not.toHaveBeenCalled()
})

test.each([
  [5, 4],
  [0.5, 2],
  [0, NaN],
  [0, Infinity],
  [0, Number.MAX_SAFE_INTEGER],
  [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
])('rejects invalid bounds %s to %s', (minimum, maximum) => {
  expect(() => randomInt(minimum, maximum)).toThrow(RangeError)
})

test.each([-0.1, 1, Infinity, NaN])(
  'rejects invalid random output %s',
  (value) => {
    expect(() => randomInt(0, 10, () => value)).toThrow(RangeError)
  },
)
