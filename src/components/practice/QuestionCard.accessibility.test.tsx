import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { createQuestion } from '../../test/questionFixtures'
import QuestionCard from './QuestionCard'

test('number shortcuts follow shuffled choice positions, allow changes, and require explicit reveal and self-report', async () => {
  const user = userEvent.setup()
  const onSelfReport = vi.fn()
  const onReveal = vi.fn()
  const onAnswerSelect = vi.fn()
  render(
    <QuestionCard
      question={createQuestion({ choices: [9, 0, 7, 6] })}
      questionNumber={1}
      onSelfReport={onSelfReport}
      onAnswerSelect={onAnswerSelect}
      onReveal={onReveal}
    />,
  )
  await user.tab()
  const first = screen.getByRole('button', { name: 'Answer 9' })
  expect(first).toHaveFocus()
  for (const [index, answer] of [9, 0, 7, 6].entries()) {
    await user.keyboard(String(index + 1))
    const choice = screen.getByRole('button', { name: `Answer ${answer}` })
    expect(choice).toHaveFocus()
    expect(choice).toHaveAttribute('aria-pressed', 'true')
    expect(choice).toHaveAttribute('aria-keyshortcuts', String(index + 1))
    expect(choice.parentElement).toHaveTextContent('✓ Selected')
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
  }
  expect(onAnswerSelect.mock.calls).toEqual([[9], [0], [7], [6]])
  expect(onReveal).not.toHaveBeenCalled()
  expect(onSelfReport).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.keyboard('1234')
  expect(onAnswerSelect).toHaveBeenCalledTimes(4)
  expect(onSelfReport).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toHaveTextContent('Your answer: 6')
  await user.tab()
  await user.keyboard(' ')
  expect(onSelfReport).toHaveBeenCalledExactlyOnceWith({
    questionId: 'question-one',
    selectedAnswer: 6,
    selfReportedCorrect: true,
  })
})

test('shortcuts stay inside the focused card and do not affect typing, navigation, or another widget', async () => {
  const user = userEvent.setup()
  const onAnswerSelect = vi.fn()
  render(
    <>
      <label>
        Your name <input />
      </label>
      <button type="button">Another action</button>
      <QuestionCard
        question={createQuestion()}
        questionNumber={1}
        onSelfReport={vi.fn()}
        onAnswerSelect={onAnswerSelect}
      />
    </>,
  )
  await user.type(screen.getByRole('textbox'), '1234')
  expect(screen.getByRole('textbox')).toHaveValue('1234')
  await user.tab()
  await user.keyboard('1234')
  expect(onAnswerSelect).not.toHaveBeenCalled()
  await user.tab()
  await user.keyboard('2')
  expect(onAnswerSelect).toHaveBeenCalledExactlyOnceWith(7)
})

test.each([
  ['addition', 3, 4, 7, '3 plus 4 equals what?'],
  ['subtraction', 9, 4, 5, '9 minus 4 equals what?'],
  ['multiplication', 3, 4, 12, '3 times 4 equals what?'],
  ['division', 12, 4, 3, '12 divided by 4 equals what?'],
] as const)(
  'announces %s using explicit operation words without revealing the answer',
  (operation, firstOperand, secondOperand, correctAnswer, text) => {
    render(
      <QuestionCard
        question={createQuestion({
          operation,
          firstOperand,
          secondOperand,
          correctAnswer,
          difficulty: 2,
          displayText: `${firstOperand} ${{ addition: '+', subtraction: '−', multiplication: '×', division: '÷' }[operation]} ${secondOperand} = ?`,
          choices: [
            correctAnswer,
            correctAnswer + 1,
            correctAnswer + 2,
            correctAnswer + 3,
          ],
        })}
        questionNumber={3}
        totalQuestions={10}
        onSelfReport={vi.fn()}
      />,
    )
    expect(screen.getByText(`Question 3 of 10. ${text}`)).toHaveAttribute(
      'aria-live',
      'polite',
    )
    expect(
      screen.getByRole('group', { name: 'Choose one answer' }),
    ).toHaveAccessibleDescription(
      `Question 3 of 10. ${text} Pick an answer to unlock your card. Keyboard tip: Tab to this card, then press 1–4 to pick an answer.`,
    )
    const reveal = screen.getByRole('status')
    expect(reveal).toBeEmptyDOMElement()
    expect(reveal.closest('[inert], [aria-hidden="true"]')).toBeNull()
  },
)

test('keeps the question announcement mounted across questions, announces position, and focuses the new question', async () => {
  const props = {
    question: createQuestion(),
    questionNumber: 1,
    totalQuestions: 5,
    onSelfReport: vi.fn(),
  }
  const { rerender } = render(<QuestionCard {...props} />)
  const announcement = screen.getByText(
    'Question 1 of 5. 3 plus 4 equals what?',
  )
  rerender(
    <QuestionCard
      {...props}
      question={createQuestion({
        id: 'next',
        firstOperand: 0,
        secondOperand: 0,
        correctAnswer: 0,
        displayText: '0 + 0 = ?',
        choices: [0, 1, 2, 3],
      })}
      questionNumber={2}
    />,
  )
  expect(announcement).toBeInTheDocument()
  expect(announcement).toHaveTextContent(
    'Question 2 of 5. 0 plus 0 equals what?',
  )
  expect(announcement).toHaveAttribute('aria-atomic', 'true')
  expect(screen.getByRole('heading', { name: '0 + 0 = ?' })).toHaveFocus()
  expect(
    screen.getByRole('progressbar', { name: 'Question progress' }),
  ).toHaveAttribute('aria-valuetext', 'Question 2 of 5')
  const user = userEvent.setup()
  await user.keyboard('1')
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(screen.getByRole('status')).toHaveTextContent(
    '0 plus 0 equals what? Correct answer: 0. Your answer: 0.',
  )
})

test('announces a restored reveal and continuous progress even with animation and explanations disabled', () => {
  render(
    <QuestionCard
      question={createQuestion()}
      questionNumber={22}
      initialSelectedAnswer={6}
      initiallyRevealed
      animationsEnabled={false}
      showExplanations={false}
      onSelfReport={vi.fn()}
    />,
  )
  expect(
    screen.getByText('Question 22. Continuous practice. 3 plus 4 equals what?'),
  ).toHaveAttribute('aria-live', 'polite')
  expect(screen.getByRole('status')).toHaveTextContent(
    'Correct answer: 7. Your answer: 6.',
  )
  expect(
    screen.getByRole('region', { name: 'Answer reveal' }),
  ).not.toHaveAttribute('inert')
  expect(screen.getByRole('article')).toHaveClass('question-card--static')
  expect(
    screen.getByRole('heading', { name: 'Let’s check it out!' }),
  ).toHaveFocus()
  expect(
    screen.queryByRole('heading', { name: 'Let’s think it through' }),
  ).not.toBeInTheDocument()
  fireEvent.keyDown(document.activeElement!, { key: '1' })
  expect(screen.getByRole('status')).toHaveTextContent('Your answer: 6.')
})
