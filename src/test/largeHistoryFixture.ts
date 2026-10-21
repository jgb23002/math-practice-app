import type { PracticeAttempt, PracticeSession } from '../types/session'

/** Deterministic, valid history: every operation/level, approximately 25% misses. */
export function largeHistoryFixture(count = 5000) {
  const operations = [
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ] as const
  const attempts: PracticeAttempt[] = []
  const sessions: PracticeSession[] = []
  for (let index = 0; index < count; index++) {
    const operation = operations[index % 4]
    const group = Math.floor(index / 50)
    const difficulty = ([1, 2, 3, 4] as const)[Math.floor((group * 50) / 4) % 4]
    const date = new Date(Date.UTC(2026, 0, 1, group)).toISOString()
    const facts =
      difficulty === 4
        ? {
            addition: [30, 12, 42],
            subtraction: [30, 12, 18],
            multiplication: [12, 3, 36],
            division: [156, 12, 13],
          }
        : {
            addition: [3, 4, 7],
            subtraction: [4, 3, 1],
            multiplication: [3, 4, 12],
            division: [8, 2, 4],
          }
    const [firstOperand, secondOperand, correctAnswer] = facts[operation]
    const selfReportedCorrect = Math.floor(index / 16) % 4 !== 0
    attempts.push({
      id: `history-attempt-${index}`,
      questionId: `history-question-${index}`,
      sessionId: `history-session-${group}`,
      operation,
      difficulty,
      firstOperand,
      secondOperand,
      correctAnswer,
      selectedAnswer: correctAnswer,
      selfReportedCorrect,
      source: 'regular',
      attemptedAt: date,
    })
    if (index % 50 === 0)
      sessions.push({
        id: `history-session-${group}`,
        startedAt: date,
        completedAt: date,
        operations: [...operations],
        difficulty,
        sessionLength: 'continuous',
        attempted: 0,
        correct: 0,
        incorrect: 0,
      })
    sessions[group].attempted++
    if (selfReportedCorrect) sessions[group].correct++
    else sessions[group].incorrect++
  }
  return { attempts, sessions }
}
