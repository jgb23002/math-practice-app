import type { MistakePattern } from '../types/mistake'

/** Reversed operands are related questions, not the same stored pattern. */
export function mistakePatternKey(
  pattern: Pick<
    MistakePattern,
    'operation' | 'firstOperand' | 'secondOperand' | 'difficulty'
  >,
): string {
  return JSON.stringify([
    pattern.operation,
    pattern.firstOperand,
    pattern.secondOperand,
    pattern.difficulty,
  ])
}
