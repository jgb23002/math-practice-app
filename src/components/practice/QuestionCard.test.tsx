import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createQuestion } from '../../test/questionFixtures'
import QuestionCard from './QuestionCard'

afterEach(() => vi.unstubAllGlobals())

function renderCard() {
  const user = userEvent.setup()
  const onSelfReport = vi.fn()
  const props = {
    question: createQuestion(),
    questionNumber: 1,
    totalQuestions: 10,
    onSelfReport,
  }
  const view = render(<QuestionCard {...props} />)
  return { ...view, user, props, onSelfReport }
}

test('starts on the front without a selection and cannot flip or report yet', () => {
  const { onSelfReport } = renderCard()
  const front = screen.getByRole('region', { name: 'Question front' })
  expect(
    within(front).getByRole('heading', { name: '3 + 4 = ?' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('region', { name: 'Answer reveal' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'I Got It Right' }),
  ).not.toBeInTheDocument()
  expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  const flip = screen.getByRole('button', { name: 'Flip Card' })
  expect(flip).toBeDisabled()
  fireEvent.click(flip)
  fireEvent.click(
    screen.getByRole('button', { name: 'I Got It Right', hidden: true }),
  )
  expect(onSelfReport).not.toHaveBeenCalled()
  expect(front).toHaveAttribute('aria-hidden', 'false')
})

test('highlights one answer, permits changes, and records nothing during selection', async () => {
  const { user, onSelfReport } = renderCard()
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  expect(
    screen.getByRole('button', { name: 'Answer 6', pressed: true }),
  ).toHaveClass('is-selected')
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Answer 8' }))
  expect(screen.getByRole('button', { name: 'Answer 6' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(
    screen.getByRole('button', { name: 'Answer 8', pressed: true }),
  ).toBeVisible()
  expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
  expect(onSelfReport).not.toHaveBeenCalled()
})

test('flips, focuses the reveal, locks the answer, and still records nothing', async () => {
  const { user, onSelfReport } = renderCard()
  const otherAnswer = screen.getByRole('button', { name: 'Answer 9' })
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const back = screen.getByRole('region', { name: 'Answer reveal' })
  expect(back).not.toHaveAttribute('inert')
  expect(
    screen.getByRole('heading', { name: 'Let’s check it out!' }),
  ).toHaveFocus()
  expect(
    screen.queryByRole('region', { name: 'Question front' }),
  ).not.toBeInTheDocument()
  expect(otherAnswer).toBeDisabled()
  fireEvent.click(otherAnswer)
  expect(
    within(back).getByText('Your answer').nextElementSibling,
  ).toHaveTextContent('7')
  expect(onSelfReport).not.toHaveBeenCalled()
})

test.each([
  [6, 'I Got It Right', true],
  [7, 'I Got It Wrong', false],
] as const)(
  'selection %s is recorded only by %s, honoring the student’s own report',
  async (selectedAnswer, button, selfReportedCorrect) => {
    const { user, onSelfReport } = renderCard()
    await user.click(
      screen.getByRole('button', { name: `Answer ${selectedAnswer}` }),
    )
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    expect(onSelfReport).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: button }))
    expect(onSelfReport).toHaveBeenCalledExactlyOnceWith({
      questionId: 'question-one',
      selectedAnswer,
      selfReportedCorrect,
    })
    expect(
      screen.getByRole('button', { name: 'I Got It Right' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'I Got It Wrong' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: button })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      `You marked this as ${selfReportedCorrect ? 'right' : 'wrong'}`,
    )
  },
)

test('zero is selectable and rapid result events cannot record both buttons', async () => {
  const user = userEvent.setup()
  const onSelfReport = vi.fn()
  render(
    <QuestionCard
      question={createQuestion({
        firstOperand: 0,
        secondOperand: 0,
        correctAnswer: 0,
        displayText: '0 + 0 = ?',
        choices: [0, 1, 2, 3],
      })}
      questionNumber={1}
      onSelfReport={onSelfReport}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Answer 0' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const right = screen.getByRole('button', { name: 'I Got It Right' })
  const wrong = screen.getByRole('button', { name: 'I Got It Wrong' })
  act(() => {
    fireEvent.click(right)
    fireEvent.click(wrong)
    fireEvent.click(right)
  })
  expect(onSelfReport).toHaveBeenCalledExactlyOnceWith({
    questionId: 'question-one',
    selectedAnswer: 0,
    selfReportedCorrect: true,
  })
})

test('a rapid answer change and flip reveal the latest selection and lock it immediately', async () => {
  const user = userEvent.setup()
  const onAnswerSelect = vi.fn()
  const onReveal = vi.fn()
  const onSelfReport = vi.fn()
  render(
    <QuestionCard
      question={createQuestion()}
      questionNumber={1}
      onAnswerSelect={onAnswerSelect}
      onReveal={onReveal}
      onSelfReport={onSelfReport}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  const six = screen.getByRole('button', { name: 'Answer 6' })
  const nine = screen.getByRole('button', { name: 'Answer 9' })
  const flip = screen.getByRole('button', { name: 'Flip Card' })
  act(() => {
    fireEvent.click(six)
    fireEvent.click(flip)
    fireEvent.click(nine)
  })
  expect(onReveal).toHaveBeenCalledExactlyOnceWith(6)
  expect(onAnswerSelect).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Your answer').nextElementSibling).toHaveTextContent(
    '6',
  )
  expect(onSelfReport).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(onSelfReport).toHaveBeenCalledExactlyOnceWith({
    questionId: 'question-one',
    selectedAnswer: 6,
    selfReportedCorrect: true,
  })
})

test('resets the answer, flip, and report lock when the question ID changes', async () => {
  const { user, props, rerender, onSelfReport } = renderCard()
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
  rerender(
    <QuestionCard
      {...props}
      question={createQuestion({ id: 'question-two' })}
      questionNumber={2}
    />,
  )
  expect(
    screen.getByRole('region', { name: 'Question front' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  expect(screen.getByRole('heading', { name: '3 + 4 = ?' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(onSelfReport).toHaveBeenCalledTimes(2)
  expect(onSelfReport).toHaveBeenLastCalledWith({
    questionId: 'question-two',
    selectedAnswer: 7,
    selfReportedCorrect: true,
  })
})

test('preserves the current answer when only animation settings change and works without animation', async () => {
  const { user, props, rerender } = renderCard()
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  rerender(<QuestionCard {...props} animationsEnabled={false} />)
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

test('supports a keyboard-only selection, flip, and self-report', async () => {
  const { user, onSelfReport } = renderCard()
  await user.tab()
  expect(screen.getByRole('article', { name: 'Question 1' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Answer 6' })).toHaveFocus()
  await user.keyboard(' ')
  await user.tab()
  await user.keyboard('{Enter}')
  await user.tab()
  await user.tab()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Flip Card' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(
    screen.getByRole('heading', { name: 'Let’s check it out!' }),
  ).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'I Got It Right' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onSelfReport).toHaveBeenCalledExactlyOnceWith({
    questionId: 'question-one',
    selectedAnswer: 7,
    selfReportedCorrect: true,
  })
})

test('respects device reduced motion, reacts to changes, and removes the listener', async () => {
  let matches = true
  const listeners = new Set<() => void>()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      media,
      get matches() {
        return matches
      },
      addEventListener: (_event: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  )
  const { user, unmount } = renderCard()
  expect(window.matchMedia).toHaveBeenCalledWith(
    '(prefers-reduced-motion: reduce)',
  )
  expect(screen.getByRole('article')).toHaveClass('question-card--static')
  await user.click(screen.getByRole('button', { name: 'Answer 7' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(
    screen.getByRole('region', { name: 'Answer reveal' }),
  ).toBeInTheDocument()
  act(() => {
    matches = false
    listeners.forEach((notify) => notify())
  })
  expect(screen.getByRole('article')).not.toHaveClass('question-card--static')
  expect(
    screen.getByRole('region', { name: 'Answer reveal' }),
  ).toBeInTheDocument()
  unmount()
  expect(listeners.size).toBe(0)
})
