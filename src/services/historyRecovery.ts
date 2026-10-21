import type { PracticeAttempt, PracticeSession } from '../types/session'
import {
  isPracticeAttempt,
  isPracticeSession,
} from '../utils/storageValidation'

/** Retain the first valid identity; overlapping records must never be summed. */
function recoverRecords<T extends { id: string }>(
  values: readonly unknown[],
  validate: (value: unknown) => value is T,
  key: (value: T) => string = (value) => value.id,
) {
  const records: T[] = [],
    ids = new Set<string>(),
    keys = new Set<string>()
  let recovered = false
  for (const value of values) {
    if (!validate(value) || ids.has(value.id) || keys.has(key(value))) {
      recovered = true
      continue
    }
    ids.add(value.id)
    keys.add(key(value))
    records.push(value)
  }
  return { records, recovered }
}

export function recoverAttempts(values: readonly unknown[]) {
  return recoverRecords<PracticeAttempt>(values, isPracticeAttempt, (a) =>
    JSON.stringify([a.sessionId, a.questionId]),
  )
}

export function recoverSessions(values: readonly unknown[]) {
  return recoverRecords<PracticeSession>(values, isPracticeSession)
}
