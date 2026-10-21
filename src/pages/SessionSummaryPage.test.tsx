import TestRouter from '../test/TestRouter'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { useNavigate } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../app/App'
import AppRoutes from '../app/AppRoutes'
import PracticeSessionContext from '../app/PracticeSessionContext'
import { createDefaultSettings } from '../config/storage'
import { createEmptyStatistics } from '../services/progressPersistence'
import * as questionGenerator from '../services/questionGenerator'
import { createQuestion } from '../test/questionFixtures'
import { createAttempt, createCompletedSession } from '../test/sessionFixtures'
import type { PracticeSessionState } from '../types/session'

afterEach(() => vi.restoreAllMocks())

function SummaryReturn() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/practice/summary')}>
      Back to Summary
    </button>
  )
}

function renderSummary(
  session: PracticeSessionState = createCompletedSession(),
) {
  const context = {
    progress: {
      settings: createDefaultSettings(),
      sessions: [],
      attempts: [],
      mistakePatterns: [],
      statistics: createEmptyStatistics(),
    },
    updateSettings: vi.fn(() => false),
    patchSettings: vi.fn(() => false),
    clearAllData: vi.fn(() => true),
    resetStatistics: vi.fn(() => true),
    storageWarning: null,
    session,
    configuration: {
      operations: ['addition'] as const,
      difficulty: 1 as const,
      sessionLength: 5 as const,
    },
    configureSession: vi.fn(() => false),
    dispatchSession: vi.fn(() => false),
    restartSession: vi.fn(() => false),
    getActiveSession: vi.fn(() => null),
    saveCurrentSession: vi.fn(() => true),
  }
  render(
    <StrictMode>
      <TestRouter initialEntries={['/practice/summary']}>
        <PracticeSessionContext.Provider value={context}>
          <AppRoutes />
          <SummaryReturn />
        </PracticeSessionContext.Provider>
      </TestRouter>
    </StrictMode>,
  )
  return { user: userEvent.setup(), context }
}

test('shows totals, accuracy, actual operations, difficulty, and completed review count', () => {
  const attempts = [
    createAttempt(),
    createAttempt({
      id: 'second',
      operation: 'division',
      firstOperand: 8,
      secondOperand: 2,
      correctAnswer: 4,
      selectedAnswer: 3,
      source: 'mistake-review',
      selfReportedCorrect: false,
    }),
    createAttempt({
      id: 'third',
      operation: 'multiplication',
      firstOperand: 3,
      secondOperand: 4,
      correctAnswer: 12,
      selectedAnswer: 12,
    }),
  ]
  renderSummary(
    createCompletedSession(attempts, {
      operations: ['addition', 'subtraction', 'multiplication', 'division'],
      difficulty: 2,
    }),
  )
  const totals = screen.getByLabelText('Session totals')
  expect(
    within(totals).getByText('Attempted').nextElementSibling,
  ).toHaveTextContent('3')
  expect(
    within(totals).getByText('Correct').nextElementSibling,
  ).toHaveTextContent('2')
  expect(
    within(totals).getByText('Incorrect').nextElementSibling,
  ).toHaveTextContent('1')
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '67%',
  )
  expect(
    screen.getByText('Operations practiced').nextElementSibling,
  ).toHaveTextContent('Addition, Multiplication, Division')
  expect(
    screen.getByText('Difficulty level').nextElementSibling,
  ).toHaveTextContent('Level 2: Easy')
  expect(
    screen.getByText('Mistake-review questions completed').nextElementSibling,
  ).toHaveTextContent('1')
  expect(document.title).toBe('Session summary | Math Practice')
})

test('shows a safe zero-attempt summary and a clear disabled mistake-practice action', async () => {
  const { user, context } = renderSummary()
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '0%',
  )
  expect(screen.getByText('No completed questions')).toBeVisible()
  const mistakes = screen.getByRole('button', { name: 'Practice Mistakes' })
  expect(mistakes).toBeDisabled()
  expect(mistakes).toHaveAccessibleDescription(/No active mistake patterns/)
  await user.click(mistakes)
  fireEvent.click(mistakes)
  expect(context.restartSession).not.toHaveBeenCalled()
  expect(context.dispatchSession).not.toHaveBeenCalled()
  expect(
    screen.getByRole('heading', { name: 'A place to celebrate' }),
  ).toBeVisible()
})

test.each([
  ['Change Settings', '/practice/setup', 'Your next math adventure'],
  ['View Statistics', '/statistics', 'See how you grow'],
  ['Return Home', '/', 'A little practice. A big adventure.'],
])('%s navigates to %s', async (label, route, heading) => {
  const { user, context } = renderSummary()
  const link = screen.getByRole('link', { name: label })
  expect(link).toHaveAttribute('href', route)
  await user.click(link)
  expect(screen.getByRole('heading', { name: heading })).toBeVisible()
  expect(context.dispatchSession).not.toHaveBeenCalled()
  expect(context.restartSession).not.toHaveBeenCalled()
  if (label === 'Change Settings') {
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Level 1: Beginner' }),
    ).toBeChecked()
    expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()
  }
})

test('returning to the summary is read-only and does not complete or count the session again', async () => {
  const session = createCompletedSession([createAttempt()])
  const timestamp = session.completedAt
  const { user, context } = renderSummary(session)
  await user.click(screen.getByRole('link', { name: 'View Statistics' }))
  await user.click(screen.getByRole('button', { name: 'Back to Summary' }))
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '100%',
  )
  expect(session.completedAt).toBe(timestamp)
  expect(session.attempts).toHaveLength(1)
  expect(context.dispatchSession).not.toHaveBeenCalled()
  expect(context.configureSession).not.toHaveBeenCalled()
})

test('Practice Again starts one fresh session with the same plan despite rapid clicks', async () => {
  let count = 0
  const generator = vi
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
        difficulty: 2,
      })
    })
  const user = userEvent.setup()
  render(
    <TestRouter initialEntries={['/practice/setup']}>
      <App />
    </TestRouter>,
  )
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Division' }))
  await user.click(screen.getByRole('radio', { name: 'Level 2: Easy' }))
  await user.click(screen.getByRole('radio', { name: 'Continuous practice' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '100%',
  )
  const again = screen.getByRole('button', { name: 'Practice Again' })
  act(() => {
    fireEvent.click(again)
    fireEvent.click(again)
    fireEvent.click(again)
  })
  expect(screen.getByText('Question 1')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  const plan = screen.getByLabelText('Your selected practice configuration')
  expect(within(plan).getByText('Addition, Division')).toBeVisible()
  expect(within(plan).getByText('Level 2: Easy')).toBeVisible()
  expect(within(plan).getByText('Continuous practice')).toBeVisible()
  expect(generator).toHaveBeenCalledTimes(3)
  const totals = screen.getByLabelText('Session totals')
  expect(
    within(totals).getByText('Attempted').nextElementSibling,
  ).toHaveTextContent('0')
  expect(screen.getByRole('main')).toHaveFocus()
})
