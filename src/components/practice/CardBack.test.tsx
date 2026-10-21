import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createQuestion } from '../../test/questionFixtures'
import type { MathOperation } from '../../types/question'
import CardBack from './CardBack'

test.each([
  ['addition', 3, 4, 7, '3 + 4 = ?', 'Put 3 and 4 together. They make 7.'],
  [
    'subtraction',
    9,
    4,
    5,
    '9 − 4 = ?',
    'Start with 9 and take away 4. You have 5 left.',
  ],
  [
    'multiplication',
    7,
    8,
    56,
    '7 × 8 = ?',
    'Think of 7 groups of 8. Altogether, that makes 56.',
  ],
  [
    'division',
    56,
    7,
    8,
    '56 ÷ 7 = ?',
    'Share 56 equally into 7 groups. There are 8 in each group.',
  ],
  [
    'division',
    0,
    1,
    0,
    '0 ÷ 1 = ?',
    'Share 0 equally into 1 group. There are 0 in each group.',
  ],
] as const)(
  'explains %s and displays both answers',
  (
    operation: MathOperation,
    firstOperand,
    secondOperand,
    correctAnswer,
    displayText,
    explanation,
  ) => {
    render(
      <CardBack
        question={createQuestion({
          operation,
          firstOperand,
          secondOperand,
          correctAnswer,
          displayText,
        })}
        selectedAnswer={correctAnswer + 1}
        active
        selfReportedCorrect={null}
        onSelfReport={vi.fn()}
      />,
    )
    expect(screen.getByText(displayText)).toBeVisible()
    expect(
      screen.getByText('Correct answer').nextElementSibling,
    ).toHaveTextContent(String(correctAnswer))
    expect(
      screen.getByText('Your answer').nextElementSibling,
    ).toHaveTextContent(String(correctAnswer + 1))
    expect(screen.getByText(explanation)).toBeVisible()
    expect(screen.getByRole('button', { name: 'I Got It Right' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'I Got It Wrong' })).toBeEnabled()
  },
)
