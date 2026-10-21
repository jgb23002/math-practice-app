import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../app/App'
import * as questionGenerator from '../services/questionGenerator'
import { createQuestion } from '../test/questionFixtures'
import type { PracticeSessionLength } from '../types/practiceConfiguration'

afterEach(() => vi.restoreAllMocks())

function mockQuestions() {
  let count = 0
  return vi
    .spyOn(questionGenerator, 'generateQuestion')
    .mockImplementation(() => {
      const first = ++count % 2 === 1 ? 3 : 4
      const answer = first + 4
      return createQuestion({
        id: `question-${count}`,
        firstOperand: first,
        correctAnswer: answer,
        displayText: `${first} + 4 = ?`,
        choices: [answer - 1, answer, answer + 1, answer + 2],
      })
    })
}

function expectTotals(attempted: number, correct: number, incorrect: number) {
  const totals = screen.getByLabelText('Session totals')
  for (const [term, value] of [
    ['Attempted', attempted],
    ['Correct', correct],
    ['Incorrect', incorrect],
  ] as const)
    expect(within(totals).getByText(term).nextElementSibling).toHaveTextContent(
      new RegExp(`^${value}$`),
    )
}

async function startPractice(sessionLength: PracticeSessionLength = 10) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  if (sessionLength !== 10)
    await user.click(
      screen.getByRole('radio', {
        name:
          sessionLength === 'continuous'
            ? 'Continuous practice'
            : `${sessionLength} questions`,
      }),
    )
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  return user
}

test('redirects to setup when the practice route has no valid session', () => {
  render(
    <MemoryRouter initialEntries={['/practice/session']}>
      <App />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: 'Your next math adventure' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Flip Card' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
})

test('shows a generated card from the plan and never writes a result to storage', async () => {
  const generator = mockQuestions()
  const save = vi.spyOn(Storage.prototype, 'setItem')
  const user = await startPractice()
  expect(generator).toHaveBeenCalledWith(['addition'], 1)
  expect(screen.getByText('Question 1 of 10')).toBeVisible()
  expect(screen.getByRole('main')).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  expectTotals(0, 0, 0)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expectTotals(0, 0, 0)
  expect(
    screen.queryByText(/Thanks for checking your work! Keep being curious/),
  ).not.toBeInTheDocument()
  expect(save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(
    screen.getByText('Thanks for checking your work! Keep being curious.'),
  ).toBeVisible()
  expect(save).not.toHaveBeenCalled()
  expect(generator).toHaveBeenCalledTimes(2)
  expectTotals(1, 1, 0)
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  expect(screen.getByRole('heading', { name: '4 + 4 = ?' })).toHaveFocus()
})

test('hides fixed progress for a continuous plan', async () => {
  vi.spyOn(questionGenerator, 'generateQuestion').mockReturnValue(
    createQuestion(),
  )
  await startPractice('continuous')
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

test('rapid clicks on both self-report buttons count once and reset the next card', async () => {
  const generator = mockQuestions()
  const user = await startPractice()
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const right = screen.getByRole('button', { name: 'I Got It Right' })
  const wrong = screen.getByRole('button', { name: 'I Got It Wrong' })
  act(() => {
    fireEvent.click(wrong)
    fireEvent.click(right)
    fireEvent.click(wrong)
  })
  expectTotals(1, 0, 1)
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  expect(generator).toHaveBeenCalledTimes(2)
})

test('rapid answer changes and a flip stay synchronized with the session before reporting', async () => {
  mockQuestions()
  const user = await startPractice()
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  const six = screen.getByRole('button', { name: 'Answer 6' })
  const nine = screen.getByRole('button', { name: 'Answer 9' })
  const flip = screen.getByRole('button', { name: 'Flip Card' })
  act(() => {
    fireEvent.click(six)
    fireEvent.click(flip)
    fireEvent.click(nine)
  })
  expect(screen.getByText('Your answer').nextElementSibling).toHaveTextContent(
    '6',
  )
  expectTotals(0, 0, 0)
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expectTotals(1, 1, 0)
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
})

test.each([5, 10, 20] as const)(
  'completes a %s-question session and stops generating cards',
  async (sessionLength) => {
    const generator = mockQuestions()
    const user = await startPractice(sessionLength)
    for (let index = 0; index < sessionLength; index++) {
      expect(
        screen.getByText(`Question ${index + 1} of ${sessionLength}`),
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
      await user.click(
        within(
          screen.getByRole('group', { name: 'Choose one answer' }),
        ).getAllByRole('button')[0],
      )
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      await user.click(
        screen.getByRole('button', {
          name: index % 2 === 0 ? 'I Got It Right' : 'I Got It Wrong',
        }),
      )
    }
    expect(
      screen.getByRole('heading', { name: 'A place to celebrate' }),
    ).toBeVisible()
    expectTotals(
      sessionLength,
      Math.ceil(sessionLength / 2),
      Math.floor(sessionLength / 2),
    )
    expect(
      screen.queryByRole('button', { name: 'Flip Card' }),
    ).not.toBeInTheDocument()
    expect(generator).toHaveBeenCalledTimes(sessionLength)
    expect(screen.getByRole('main')).toHaveFocus()
  },
  15000,
)

test('continuous practice advances and ends without counting an unfinished card', async () => {
  mockQuestions()
  const confirm = vi
    .spyOn(window, 'confirm')
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
  const user = await startPractice('continuous')
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(screen.getByText('Question 2')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Answer 8' }))
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expect(screen.getByText('Question 2')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expect(
    screen.getByRole('heading', { name: 'A place to celebrate' }),
  ).toBeVisible()
  expectTotals(1, 1, 0)
  expect(confirm).toHaveBeenCalledTimes(2)
})

test('an empty continuous session can end without a confirmation or a phantom attempt', async () => {
  mockQuestions()
  const confirm = vi.spyOn(window, 'confirm')
  const user = await startPractice('continuous')
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expectTotals(0, 0, 0)
  expect(confirm).not.toHaveBeenCalled()
})

test('retrying a failed next card preserves totals and does not re-record the previous card', async () => {
  const generator = mockQuestions()
  const user = await startPractice()
  generator.mockImplementationOnce(() => {
    throw new Error('No next card')
  })
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expectTotals(1, 1, 0)
  expect(screen.getByRole('alert')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Try Again' }))
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
  expectTotals(1, 1, 0)
})

function ReturnToSession() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/practice/session')}>
      Back to Session
    </button>
  )
}

test('restores a revealed question when returning to an active session', async () => {
  mockQuestions()
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
      <ReturnToSession />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    within(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).getByRole('link', { name: 'Settings' }),
  )
  await user.click(screen.getByRole('button', { name: 'Back to Session' }))
  expect(
    screen.getByRole('region', { name: 'Answer reveal' }),
  ).toBeInTheDocument()
  expect(screen.getByText('Your answer').nextElementSibling).toHaveTextContent(
    '6',
  )
  expectTotals(0, 0, 0)
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expectTotals(1, 1, 0)
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
})
