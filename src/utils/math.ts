export type RandomSource = () => number

/** Uniform integer in the inclusive range [minimum, maximum]. */
export function randomInt(
  minimum: number,
  maximum: number,
  random: RandomSource = Math.random,
): number {
  const size = maximum - minimum + 1
  if (
    !Number.isSafeInteger(minimum) ||
    !Number.isSafeInteger(maximum) ||
    minimum > maximum ||
    !Number.isSafeInteger(size)
  ) {
    throw new RangeError(
      'Random integer bounds must form a nonempty, safe integer range.',
    )
  }
  if (minimum === maximum) return minimum

  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      'A random source must return a finite number from 0 up to, but not including, 1.',
    )
  }
  return minimum + Math.floor(value * size)
}
