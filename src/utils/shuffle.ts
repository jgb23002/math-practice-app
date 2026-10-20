import { randomInt, type RandomSource } from './math'

/** Fisher–Yates shuffle; the original array is never modified. */
export function shuffleArray<T>(
  values: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = randomInt(0, index, random)
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }
  return shuffled
}
