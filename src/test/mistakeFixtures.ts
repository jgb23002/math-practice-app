import type { MistakePattern } from '../types/mistake'

export function createMistakePattern(
  overrides: Partial<MistakePattern> = {},
): MistakePattern {
  return {
    id: 'mistake-one',
    operation: 'addition',
    firstOperand: 3,
    secondOperand: 4,
    correctAnswer: 7,
    difficulty: 1,
    lastIncorrectAt: '2026-10-20T12:01:00.000Z',
    incorrectCount: 1,
    similarCorrectCount: 0,
    mastered: false,
    ...overrides,
  }
}
