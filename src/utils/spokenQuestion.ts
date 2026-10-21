import type { Question } from '../types/question'

const operationWords = {
  addition: 'plus',
  subtraction: 'minus',
  multiplication: 'times',
  division: 'divided by',
} as const

/** Explicit words avoid relying on a screen reader's symbol verbosity. */
export function spokenQuestion(question: Question): string {
  return `${question.firstOperand} ${operationWords[question.operation]} ${question.secondOperand} equals what?`
}
