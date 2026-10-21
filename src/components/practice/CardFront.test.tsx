import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { createQuestion } from '../../test/questionFixtures'
import CardFront from './CardFront'

test('shows four choices, question position, and a flip button enabled only after selection', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  const onFlip = vi.fn()
  const props = {
    question: createQuestion(),
    questionNumber: 3,
    totalQuestions: 10,
    active: true,
    onSelect,
    onFlip,
  }
  const { rerender } = render(<CardFront {...props} selectedAnswer={null} />)
  expect(screen.getByRole('heading', { name: '3 + 4 = ?' })).toBeVisible()
  expect(screen.getByText('Question 3 of 10')).toBeVisible()
  expect(
    within(
      screen.getByRole('group', { name: 'Choose one answer' }),
    ).getAllByRole('button'),
  ).toHaveLength(4)
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  expect(onSelect).toHaveBeenCalledWith(6)
  rerender(<CardFront {...props} selectedAnswer={6} />)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(onFlip).toHaveBeenCalledOnce()
})

test('omits fixed progress and the total for continuous practice', () => {
  render(
    <CardFront
      question={createQuestion()}
      questionNumber={12}
      selectedAnswer={null}
      active
      onSelect={vi.fn()}
      onFlip={vi.fn()}
    />,
  )
  expect(screen.getByText('Question 12')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
