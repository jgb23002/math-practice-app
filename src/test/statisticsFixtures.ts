import { createDefaultSettings } from '../config/storage'
import type { StoredProgress } from '../types/persistence'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import { createAttempt } from './sessionFixtures'

export function createStatisticsAttempt(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  index: number,
  correct: boolean,
): PracticeAttempt {
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
  return createAttempt({
    id: `attempt-${index}`,
    questionId: `question-${index}`,
    sessionId: `session-${difficulty}`,
    operation,
    difficulty,
    firstOperand,
    secondOperand,
    correctAnswer,
    selectedAnswer: correctAnswer + 1,
    selfReportedCorrect: correct,
    attemptedAt: `2026-10-${16 + difficulty}T12:01:00.000Z`,
  })
}

export function createStatisticsProgress(): StoredProgress {
  const attempts = [
    createStatisticsAttempt('addition', 1, 1, true),
    createStatisticsAttempt('subtraction', 1, 2, false),
    createStatisticsAttempt('multiplication', 2, 3, true),
    createStatisticsAttempt('division', 2, 4, false),
    createStatisticsAttempt('addition', 3, 5, false),
    createStatisticsAttempt('multiplication', 3, 6, true),
    createStatisticsAttempt('subtraction', 4, 7, true),
    createStatisticsAttempt('division', 4, 8, true),
  ]
  const sessions: PracticeSession[] = ([1, 2, 3, 4] as const).map(
    (difficulty) => ({
      id: `session-${difficulty}`,
      operations: attempts
        .filter((attempt) => attempt.difficulty === difficulty)
        .map((attempt) => attempt.operation),
      difficulty,
      sessionLength: 'continuous',
      startedAt: `2026-10-${16 + difficulty}T12:00:00.000Z`,
      ...(difficulty === 4
        ? {}
        : { completedAt: `2026-10-${16 + difficulty}T12:05:00.000Z` }),
      attempted: 2,
      correct: difficulty === 4 ? 2 : 1,
      incorrect: difficulty === 4 ? 0 : 1,
    }),
  )
  return {
    settings: {
      ...createDefaultSettings(),
      soundEnabled: true,
      animationsEnabled: false,
      defaultOperations: ['multiplication', 'division'],
      defaultDifficulty: 4,
      defaultSessionLength: 20,
    },
    attempts,
    mistakePatterns: [],
    sessions: [sessions[1], sessions[3], sessions[0], sessions[2]],
    statistics: {
      attempted: 8,
      correct: 5,
      incorrect: 3,
      byOperation: {
        addition: { attempted: 2, correct: 1, incorrect: 1 },
        subtraction: { attempted: 2, correct: 1, incorrect: 1 },
        multiplication: { attempted: 2, correct: 2, incorrect: 0 },
        division: { attempted: 2, correct: 1, incorrect: 1 },
      },
      byDifficulty: {
        1: { attempted: 2, correct: 1, incorrect: 1 },
        2: { attempted: 2, correct: 1, incorrect: 1 },
        3: { attempted: 2, correct: 1, incorrect: 1 },
        4: { attempted: 2, correct: 2, incorrect: 0 },
      },
    },
  }
}
