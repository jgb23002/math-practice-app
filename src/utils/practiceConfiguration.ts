import {
  difficultyOptions,
  operationOptions,
  sessionLengthOptions,
} from '../config/practice'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

export function isValidPracticeConfiguration(
  value: unknown,
): value is PracticeConfiguration {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false

  const configuration = value as Record<string, unknown>
  const { operations, difficulty, sessionLength } = configuration

  return (
    Array.isArray(operations) &&
    operations.length > 0 &&
    new Set(operations).size === operations.length &&
    [...operations].every((operation) =>
      operationOptions.some((option) => option.value === operation),
    ) &&
    difficultyOptions.some((option) => option.value === difficulty) &&
    sessionLengthOptions.some((option) => option.value === sessionLength)
  )
}
