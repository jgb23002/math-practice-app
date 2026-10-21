import TestRouter from '../test/TestRouter'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, type PropsWithChildren } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import StorageWarning from '../components/common/StorageWarning'
import { STORAGE_KEYS } from '../config/storage'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import {
  SAVE_WARNING,
  saveStoredProgress,
} from '../services/progressPersistence'
import * as questionGenerator from '../services/questionGenerator'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createQuestion } from '../test/questionFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import App from './App'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

function mockQuestions() {
  let count = 0
  vi.spyOn(questionGenerator, 'generateQuestion').mockImplementation(() => {
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

const plan = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 'continuous',
}

function reveal(api: ReturnType<typeof usePracticeConfiguration>) {
  const sessionId = api.session!.id
  const question = api.session!.currentQuestion!
  const answer = question.correctAnswer
  api.dispatchSession({
    type: 'select',
    sessionId,
    questionId: question.id,
    answer,
  })
  api.dispatchSession({
    type: 'reveal',
    sessionId,
    questionId: question.id,
    answer,
  })
  return {
    type: 'report' as const,
    sessionId,
    result: {
      questionId: question.id,
      selectedAnswer: answer,
      selfReportedCorrect: false,
    },
  }
}

test('real card records only explicit self-reported mistakes, including disagreement with selected correctness', async () => {
  mockQuestions()
  render(
    <TestRouter initialEntries={['/practice/setup']}>
      <App />
    </TestRouter>,
  )
  const user = userEvent.setup()
  const patterns = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!)
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(patterns()).toEqual([])
  // 3 + 4: a wrong selection and reveal alone are not mistakes.
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  expect(patterns()).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(patterns()).toEqual([])
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(patterns()).toEqual([])
  // 4 + 4: even a correct selection becomes a mistake if self-reported wrong.
  await user.click(screen.getByRole('button', { name: 'Answer 8' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(patterns()).toEqual([])
  await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
  const attempts = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)
  expect(patterns()).toEqual([
    expect.objectContaining({
      operation: 'addition',
      firstOperand: 4,
      secondOperand: 4,
      correctAnswer: 8,
      difficulty: 1,
      incorrectCount: 1,
      similarCorrectCount: 0,
      mastered: false,
      lastIncorrectAt: attempts[1].attemptedAt,
    }),
  ])
  expect(screen.getByText('Question 3 of 10')).toBeVisible()
})

test('rapid stale reports create one pattern and one count in Strict Mode; ending does not recount it', () => {
  mockQuestions()
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <AppProvider>{children}</AppProvider>
    </StrictMode>
  )
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession(plan)
  })
  act(() => {
    const action = reveal(result.current)
    expect(result.current.dispatchSession(action)).toBe(true)
    for (let repeat = 0; repeat < 100; repeat++)
      expect(result.current.dispatchSession(action)).toBe(false)
  })
  expect(result.current.progress.mistakePatterns).toHaveLength(1)
  const pattern = result.current.progress.mistakePatterns[0]
  expect(pattern.incorrectCount).toBe(1)
  act(() => {
    reveal(result.current)
    result.current.dispatchSession({
      type: 'end',
      sessionId: result.current.session!.id,
    })
  })
  expect(result.current.progress.mistakePatterns).toEqual([pattern])
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!),
  ).toEqual([pattern])
})

test('startup preserves mastery, repeated mistakes update it across sessions/remounts, and resets keep the intended categories', () => {
  mockQuestions()
  const { storage, data } = memoryStorage()
  const progress = emptyProgress()
  const original = createMistakePattern({
    incorrectCount: 2,
    similarCorrectCount: 3,
    mastered: true,
  })
  progress.mistakePatterns = [original]
  saveStoredProgress(storage, progress)
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <AppProvider storage={storage}>{children}</AppProvider>
    </StrictMode>
  )
  const first = renderHook(usePracticeConfiguration, { wrapper })
  expect(first.result.current.progress.mistakePatterns).toEqual([original])
  act(() => {
    first.result.current.configureSession(plan)
  })
  act(() => {
    first.result.current.dispatchSession(reveal(first.result.current))
  })
  const updated = first.result.current.progress.mistakePatterns[0]
  expect(updated).toMatchObject({
    id: original.id,
    incorrectCount: 3,
    similarCorrectCount: 0,
    mastered: false,
  })
  first.unmount()
  const next = renderHook(usePracticeConfiguration, { wrapper })
  expect(next.result.current.progress.mistakePatterns).toEqual([updated])
  act(() => {
    next.result.current.configureSession(plan)
  })
  // Generator now returns 3 + 4 again, with a new session and question ID.
  act(() => {
    next.result.current.dispatchSession(reveal(next.result.current))
  })
  expect(next.result.current.progress.mistakePatterns).toEqual([
    expect.objectContaining({ id: original.id, incorrectCount: 4 }),
  ])
  const patterns = next.result.current.progress.mistakePatterns
  act(() => {
    next.result.current.patchSettings({ animationsEnabled: false })
    next.result.current.resetStatistics()
  })
  expect(next.result.current.progress.mistakePatterns).toEqual(patterns)
  expect(next.result.current.progress.attempts).toEqual([])
  expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)).toEqual(patterns)
  act(() => {
    expect(next.result.current.clearAllData()).toBe(true)
  })
  expect(next.result.current.progress.mistakePatterns).toEqual([])
  expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)).toEqual([])
})

test('a pattern-specific quota failure shows the warning, keeps practice working, and saves on retry', () => {
  mockQuestions()
  const { storage, access, data } = memoryStorage()
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider storage={storage}>
      {children}
      <StorageWarning />
    </AppProvider>
  )
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  const write = access.setItem.getMockImplementation()!
  access.setItem.mockImplementation((key, value) => {
    if (key === STORAGE_KEYS.mistakePatterns)
      throw new DOMException('Full', 'QuotaExceededError')
    write(key, value)
  })
  act(() => {
    result.current.configureSession(plan)
  })
  act(() => {
    result.current.dispatchSession(reveal(result.current))
  })
  expect(screen.getByRole('status')).toHaveTextContent(SAVE_WARNING)
  expect(result.current.session!.attempted).toBe(1)
  const patterns = result.current.progress.mistakePatterns
  expect(patterns[0].incorrectCount).toBe(1)
  expect(data.get(STORAGE_KEYS.mistakePatterns)).toBe('[]')
  access.setItem.mockImplementation(write)
  act(() => {
    result.current.patchSettings({ showExplanations: false })
  })
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)).toEqual(patterns)
})
