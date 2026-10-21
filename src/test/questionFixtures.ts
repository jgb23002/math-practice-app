import type { Question } from '../types/question'

export function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'question-one',
    operation: 'addition',
    firstOperand: 3,
    secondOperand: 4,
    correctAnswer: 7,
    displayText: '3 + 4 = ?',
    choices: [6, 7, 8, 9],
    difficulty: 1,
    source: 'regular',
    ...overrides,
  }
}
