import { QUESTION_SYMBOLS } from '../config/difficulty'
import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppSettings } from '../types/settings'
import type { AppStatistics, OperationStatistics } from '../types/statistics'
import { isValidPracticeConfiguration } from './practiceConfiguration'
import { mistakePatternKey } from './mistakePattern'
import {
  isDifficultyLevel,
  isMathOperation,
  isValidArithmeticQuestion,
} from './validation'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function id(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}
function operations(value: unknown) {
  return (
    Array.isArray(value) &&
    [...value].every(isMathOperation) &&
    new Set(value).size === value.length
  )
}
function totals(value: unknown): value is OperationStatistics {
  return (
    record(value) &&
    integer(value.attempted) &&
    integer(value.correct) &&
    integer(value.incorrect) &&
    value.attempted === value.correct + value.incorrect
  )
}

export function isAppSettings(value: unknown): value is AppSettings {
  return (
    record(value) &&
    typeof value.soundEnabled === 'boolean' &&
    typeof value.animationsEnabled === 'boolean' &&
    typeof value.showExplanations === 'boolean' &&
    [5, 10, 20, 'continuous'].includes(value.defaultSessionLength as number) &&
    isDifficultyLevel(value.defaultDifficulty) &&
    operations(value.defaultOperations) &&
    integer(value.masteryThreshold) &&
    value.masteryThreshold > 0
  )
}

export function isPracticeAttempt(value: unknown): value is PracticeAttempt {
  if (!record(value) || !isMathOperation(value.operation)) return false
  return (
    id(value.id) &&
    id(value.questionId) &&
    id(value.sessionId) &&
    timestamp(value.attemptedAt) &&
    integer(value.selectedAnswer) &&
    typeof value.selfReportedCorrect === 'boolean' &&
    (value.source === 'regular' || value.source === 'mistake-review') &&
    (value.mistakePatternId === undefined ||
      (value.source === 'mistake-review' && id(value.mistakePatternId))) &&
    isValidArithmeticQuestion({
      ...value,
      // Attempts store arithmetic, not presentation or a review-pattern ID.
      source: 'regular',
      displayText: `${value.firstOperand} ${QUESTION_SYMBOLS[value.operation]} ${value.secondOperand} = ?`,
    })
  )
}

export function isPracticeSession(value: unknown): value is PracticeSession {
  return (
    record(value) &&
    id(value.id) &&
    timestamp(value.startedAt) &&
    isValidPracticeConfiguration(value) &&
    totals(value) &&
    (value.sessionLength === 'continuous' ||
      value.attempted <= (value.sessionLength as number)) &&
    (value.completedAt === undefined ||
      (timestamp(value.completedAt) && value.completedAt >= value.startedAt))
  )
}

function uniqueRecords<T extends { id: string }>(
  value: unknown,
  validate: (item: unknown) => item is T,
): value is T[] {
  return (
    Array.isArray(value) &&
    [...value].every(validate) &&
    new Set(value.map((item: T) => item.id)).size === value.length
  )
}
export function isAttemptHistory(value: unknown): value is PracticeAttempt[] {
  return (
    uniqueRecords(value, isPracticeAttempt) &&
    new Set(
      value.map((item) => JSON.stringify([item.sessionId, item.questionId])),
    ).size === value.length
  )
}
export function isSessionHistory(value: unknown): value is PracticeSession[] {
  return uniqueRecords(value, isPracticeSession)
}

export function isMistakePattern(value: unknown): value is MistakePattern {
  if (!record(value) || !isMathOperation(value.operation)) return false
  return (
    timestamp(value.lastIncorrectAt) &&
    integer(value.incorrectCount) &&
    value.incorrectCount > 0 &&
    integer(value.similarCorrectCount) &&
    typeof value.mastered === 'boolean' &&
    isValidArithmeticQuestion({
      ...value,
      source: 'regular',
      displayText: `${value.firstOperand} ${QUESTION_SYMBOLS[value.operation]} ${value.secondOperand} = ?`,
    })
  )
}

export function isMistakePatternHistory(
  value: unknown,
): value is MistakePattern[] {
  return (
    uniqueRecords(value, isMistakePattern) &&
    new Set(value.map(mistakePatternKey)).size === value.length
  )
}

export function isAppStatistics(value: unknown): value is AppStatistics {
  if (!record(value) || !totals(value)) return false
  const candidate = value as unknown as Record<string, unknown>
  for (const [group, keys] of [
    [candidate.byOperation, Object.keys(QUESTION_SYMBOLS)],
    [candidate.byDifficulty, ['1', '2', '3', '4']],
  ] as const) {
    if (!record(group) || !keys.every((key) => totals(group[key]))) return false
    for (const field of ['attempted', 'correct', 'incorrect'] as const)
      if (
        keys.reduce(
          (sum, key) => sum + (group[key] as OperationStatistics)[field],
          0,
        ) !== value[field]
      )
        return false
  }
  return true
}
