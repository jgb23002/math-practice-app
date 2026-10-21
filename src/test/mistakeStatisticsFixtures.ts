import type { StoredProgress } from '../types/persistence'
import { calculateStatistics } from '../utils/statistics'
import { createMistakePattern } from './mistakeFixtures'
import { createAttempt } from './sessionFixtures'
import { emptyProgress } from './storageFixtures'

export function createMistakeStatisticsProgress(): StoredProgress {
  const progress = emptyProgress()
  progress.mistakePatterns = [
    createMistakePattern({
      id: 'addition-one',
      incorrectCount: 5,
      similarCorrectCount: 2,
    }),
    createMistakePattern({
      id: 'addition-two',
      difficulty: 2,
      firstOperand: 4,
      secondOperand: 3,
      incorrectCount: 3,
      lastIncorrectAt: '2026-10-21T12:01:00.000Z',
    }),
    createMistakePattern({
      id: 'multiplication',
      operation: 'multiplication',
      correctAnswer: 12,
      incorrectCount: 8,
      similarCorrectCount: 3,
      mastered: true,
      lastIncorrectAt: '2026-10-19T12:01:00.000Z',
    }),
    createMistakePattern({
      id: 'subtraction',
      operation: 'subtraction',
      firstOperand: 7,
      secondOperand: 3,
      correctAnswer: 4,
      incorrectCount: 5,
      similarCorrectCount: 1,
      lastIncorrectAt: '2026-10-21T12:01:00.000Z',
    }),
    createMistakePattern({
      id: 'division',
      operation: 'division',
      firstOperand: 8,
      secondOperand: 2,
      correctAnswer: 4,
      incorrectCount: 1,
      lastIncorrectAt: '2026-10-18T12:01:00.000Z',
    }),
  ]
  progress.attempts = [
    createAttempt({
      source: 'mistake-review',
      mistakePatternId: 'addition-one',
      selfReportedCorrect: true,
    }),
    createAttempt({
      source: 'mistake-review',
      mistakePatternId: 'multiplication',
      operation: 'division',
      firstOperand: 12,
      secondOperand: 3,
      correctAnswer: 4,
      selectedAnswer: 4,
      selfReportedCorrect: false,
    }),
    createAttempt({
      source: 'mistake-review',
      mistakePatternId: 'addition-one',
      operation: 'subtraction',
      firstOperand: 7,
      secondOperand: 3,
      correctAnswer: 4,
      selectedAnswer: 3,
      selfReportedCorrect: true,
    }),
    // Legacy review history without attribution still contributes to review totals.
    createAttempt({
      source: 'mistake-review',
      operation: 'multiplication',
      correctAnswer: 12,
      selectedAnswer: 12,
      selfReportedCorrect: true,
    }),
    createAttempt({
      operation: 'division',
      firstOperand: 8,
      secondOperand: 2,
      correctAnswer: 4,
      selectedAnswer: 4,
      selfReportedCorrect: false,
    }),
  ].map((attempt, index) => ({
    ...attempt,
    id: `attempt-${index}`,
    questionId: `question-${index}`,
  }))
  progress.statistics = calculateStatistics(progress.attempts)
  return progress
}
