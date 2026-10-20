import { expect, test, vi } from 'vitest'
import { shuffleArray } from './shuffle'

test('shuffles without modifying the original or losing entries', () => {
  const original = Object.freeze([1, 2, 3, 4])
  const result = shuffleArray(original, () => 0)
  expect(result).toEqual([2, 3, 4, 1])
  expect(original).toEqual([1, 2, 3, 4])
  expect([...result].sort()).toEqual([...original])
})

test('permits an unchanged order and handles duplicate values', () => {
  expect(shuffleArray(['a', 'a', 'b'], () => 1 - Number.EPSILON)).toEqual([
    'a',
    'a',
    'b',
  ])
})

test('returns independent empty and singleton arrays without RNG calls', () => {
  const random = vi.fn()
  const single = [42]
  expect(shuffleArray([], random)).toEqual([])
  expect(shuffleArray(single, random)).toEqual(single)
  expect(shuffleArray(single, random)).not.toBe(single)
  expect(random).not.toHaveBeenCalled()
})

test('rejects an invalid random source instead of looping', () => {
  expect(() => shuffleArray([1, 2], () => 1)).toThrow(RangeError)
})
