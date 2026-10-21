import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, type PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import StorageWarning from '../components/common/StorageWarning'
import { STORAGE_KEYS } from '../config/storage'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import { SAVE_WARNING } from '../services/progressPersistence'
import * as questionGenerator from '../services/questionGenerator'
import { createQuestion } from '../test/questionFixtures'
import { memoryStorage } from '../test/storageFixtures'
import App from './App'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

function mockQuestions() {
  let count = 0
  return vi
    .spyOn(questionGenerator, 'generateQuestion')
    .mockImplementation(() => {
      const first = ++count % 2 === 1 ? 3 : 4
      return createQuestion({
        id: `question-${count}`,
        firstOperand: first,
        correctAnswer: first + 4,
        displayText: `${first} + 4 = ?`,
        choices: [6, 7, 8, 9],
      })
    })
}

function report(
  api: ReturnType<typeof usePracticeConfiguration>,
  correct = false,
) {
  const sessionId = api.session!.id
  const questionId = api.session!.currentQuestion!.id
  act(() => {
    api.dispatchSession({ type: 'select', sessionId, questionId, answer: 6 })
    api.dispatchSession({ type: 'reveal', sessionId, questionId, answer: 6 })
    api.dispatchSession({
      type: 'report',
      sessionId,
      result: { questionId, selectedAnswer: 6, selfReportedCorrect: correct },
    })
  })
}

const plan = { operations: ['addition'], difficulty: 1, sessionLength: 5 }

test('persists complete sessions and individual attempts across provider remounts without duplicates in Strict Mode', () => {
  const generator = mockQuestions()
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <AppProvider>{children}</AppProvider>
    </StrictMode>
  )
  const first = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    first.result.current.configureSession(plan)
  })
  for (let index = 0; index < 5; index++)
    report(first.result.current, index !== 0)
  const completed = first.result.current.session!
  expect(completed.isActive).toBe(false)
  const snapshot = JSON.stringify(localStorage)
  act(() => {
    for (let repeat = 0; repeat < 5; repeat++) {
      expect(
        first.result.current.dispatchSession({
          type: 'end',
          sessionId: completed.id,
        }),
      ).toBe(false)
      expect(
        first.result.current.dispatchSession({
          type: 'retry',
          sessionId: completed.id,
        }),
      ).toBe(false)
    }
  })
  expect(JSON.stringify(localStorage)).toBe(snapshot)
  first.unmount()
  const next = renderHook(usePracticeConfiguration, { wrapper })
  expect(next.result.current.progress.sessions).toHaveLength(1)
  expect(next.result.current.progress.sessions[0]).toMatchObject({
    id: completed.id,
    completedAt: completed.completedAt,
    attempted: 5,
    correct: 4,
    incorrect: 1,
  })
  expect(next.result.current.progress.attempts).toHaveLength(5)
  expect(next.result.current.progress.attempts[0]).toMatchObject({
    selectedAnswer: 6,
    selfReportedCorrect: false,
    sessionId: completed.id,
    operation: 'addition',
    difficulty: 1,
  })
  expect(next.result.current.progress.attempts[0].attemptedAt).toMatch(
    /^\d{4}-/,
  )
  expect(next.result.current.progress.statistics).toMatchObject({
    attempted: 5,
    correct: 4,
    incorrect: 1,
  })
  expect(next.result.current.configuration).toMatchObject(plan)
  expect(next.result.current.session).toBeNull()
  expect(generator).toHaveBeenCalledTimes(5)
})

test('settings save independent snapshots, reject invalid updates, and load after remount', () => {
  const { storage } = memoryStorage()
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider storage={storage}>{children}</AppProvider>
  )
  const first = renderHook(usePracticeConfiguration, { wrapper })
  const settings = {
    ...first.result.current.progress.settings,
    animationsEnabled: false,
    defaultOperations: ['addition' as const],
    defaultDifficulty: 3 as const,
    masteryThreshold: 5,
  }
  act(() => {
    expect(first.result.current.updateSettings(settings)).toBe(true)
  })
  settings.defaultOperations.push('addition')
  act(() => {
    expect(
      first.result.current.updateSettings({ ...settings, masteryThreshold: 0 }),
    ).toBe(false)
  })
  first.unmount()
  const next = renderHook(usePracticeConfiguration, { wrapper })
  expect(next.result.current.progress.settings).toMatchObject({
    animationsEnabled: false,
    defaultOperations: ['addition'],
    defaultDifficulty: 3,
    masteryThreshold: 5,
  })
})

test('rapid reports in one React batch retain both attempts and reject a replay', () => {
  mockQuestions()
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  act(() => {
    result.current.configureSession(plan)
  })
  const sessionId = result.current.session!.id
  act(() => {
    for (const questionId of ['question-1', 'question-2']) {
      result.current.dispatchSession({
        type: 'select',
        sessionId,
        questionId,
        answer: 6,
      })
      result.current.dispatchSession({
        type: 'reveal',
        sessionId,
        questionId,
        answer: 6,
      })
      const action = {
        type: 'report',
        sessionId,
        result: { questionId, selectedAnswer: 6, selfReportedCorrect: false },
      } as const
      expect(result.current.dispatchSession(action)).toBe(true)
      expect(result.current.dispatchSession(action)).toBe(false)
    }
  })
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(
    2,
  )
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.statistics)!),
  ).toMatchObject({ attempted: 2, correct: 0, incorrect: 2 })
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)[0].attempted,
  ).toBe(2)
})

test('saving failure shows a friendly warning and practice still progresses; later writes can recover', () => {
  mockQuestions()
  const { storage, access } = memoryStorage()
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider storage={storage}>
      {children}
      <StorageWarning />
    </AppProvider>
  )
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  const write = access.setItem.getMockImplementation()!
  access.setItem.mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  act(() => {
    result.current.configureSession(plan)
  })
  expect(screen.getByRole('status')).toHaveTextContent(SAVE_WARNING)
  report(result.current)
  expect(result.current.session!.attempted).toBe(1)
  expect(result.current.session!.currentQuestionIndex).toBe(1)
  expect(result.current.progress.statistics.attempted).toBe(1)
  access.setItem.mockImplementation(write)
  report(result.current, true)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(JSON.parse(access.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(2)
})

test('blocked localStorage access leaves the real app usable with an accessible warning', async () => {
  mockQuestions()
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText(SAVE_WARNING)).toHaveAttribute('role', 'status')
  const user = userEvent.setup()
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
  expect(screen.getByText(SAVE_WARNING)).toBeVisible()
})

test('the existing animation control persists through a full application remount', async () => {
  mockQuestions()
  const renderApp = () =>
    render(
      <MemoryRouter initialEntries={['/practice/setup']}>
        <App />
      </MemoryRouter>,
    )
  const first = renderApp()
  const user = userEvent.setup()
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('checkbox', { name: /Card animation/ }))
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!).animationsEnabled,
  ).toBe(false)
  first.unmount()
  renderApp()
  expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 1: Beginner' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(
    screen.getByRole('checkbox', { name: /Card animation/ }),
  ).not.toBeChecked()
})

test('a newer schema never gets overwritten as the student practices', () => {
  mockQuestions()
  const { storage, access, data } = memoryStorage({
    [STORAGE_KEYS.version]: '{"version":99}',
    'other.app': 'keep',
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider storage={storage}>{children}</AppProvider>
  )
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession(plan)
  })
  report(result.current)
  expect(result.current.session!.attempted).toBe(1)
  expect(result.current.storageWarning).toMatch(/won’t be saved/)
  expect(access.setItem).not.toHaveBeenCalled()
  expect(data.get(STORAGE_KEYS.version)).toBe('{"version":99}')
})
