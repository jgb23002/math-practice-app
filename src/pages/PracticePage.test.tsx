import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../app/App'
import * as questionGenerator from '../services/questionGenerator'
import { createQuestion } from '../test/questionFixtures'

afterEach(() => vi.restoreAllMocks())

async function startPractice(continuous = false) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  if (continuous)
    await user.click(screen.getByRole('radio', { name: 'Continuous practice' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  return user
}

test('offers setup when the practice route has no configuration', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/practice/session']}>
      <App />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: 'Let’s find your next challenge' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Flip Card' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Explore Practice' }))
  expect(
    screen.getByRole('heading', { name: 'Your next math adventure' }),
  ).toBeVisible()
})

test('shows a generated card from the plan and never writes a result to storage', async () => {
  const generator = vi
    .spyOn(questionGenerator, 'generateQuestion')
    .mockReturnValue(createQuestion())
  const save = vi.spyOn(Storage.prototype, 'setItem')
  const user = await startPractice()
  expect(generator).toHaveBeenCalledWith(['addition'], 1)
  expect(screen.getByText('Question 1 of 10')).toBeVisible()
  expect(screen.getByRole('main')).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(
    screen.queryByText(/Thanks for checking your work! Keep being curious/),
  ).not.toBeInTheDocument()
  expect(save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(
    screen.getByText('Thanks for checking your work! Keep being curious.'),
  ).toBeVisible()
  expect(save).not.toHaveBeenCalled()
  expect(generator).toHaveBeenCalledOnce()
})

test('hides fixed progress for a continuous plan', async () => {
  vi.spyOn(questionGenerator, 'generateQuestion').mockReturnValue(
    createQuestion(),
  )
  await startPractice(true)
  expect(screen.getByText('Question 1')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

test('turns animations off without changing the answer', async () => {
  vi.spyOn(questionGenerator, 'generateQuestion').mockReturnValue(
    createQuestion(),
  )
  const user = await startPractice()
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('checkbox', { name: /Card animation/ }))
  expect(screen.getByRole('article')).toHaveClass('question-card--static')
  expect(screen.getByRole('button', { name: 'Answer 7' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(
    screen.getByRole('region', { name: 'Answer reveal' }),
  ).toBeInTheDocument()
})

test('recovers from a generation error with a friendly retry', async () => {
  const generator = vi
    .spyOn(questionGenerator, 'generateQuestion')
    .mockReturnValue(createQuestion())
    .mockImplementationOnce(() => {
      throw new Error('Generation failed')
    })
  const user = await startPractice()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'That card got a little tangled.',
  )
  await user.click(screen.getByRole('button', { name: 'Try Again' }))
  expect(screen.getByRole('heading', { name: '3 + 4 = ?' })).toBeVisible()
  expect(generator).toHaveBeenCalledTimes(2)
})
