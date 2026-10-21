import { act, renderHook } from '@testing-library/react'
import { StrictMode, type PropsWithChildren } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import { saveStoredProgress } from '../services/progressPersistence'
import * as similar from '../services/similarQuestionGenerator'
import * as regular from '../services/questionGenerator'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createQuestion } from '../test/questionFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import type { StoredProgress } from '../types/persistence'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())
const plan = {
  mode: 'mistake-review',
  operations: ['addition', 'subtraction'],
  difficulty: 1,
  sessionLength: 5,
}

function setup(progress: StoredProgress) {
  const saved = memoryStorage()
  expect(saveStoredProgress(saved.storage, progress)).toBe(true)
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <AppProvider storage={saved.storage}>{children}</AppProvider>
    </StrictMode>
  )
  return { ...saved, wrapper }
}
function report(
  api: ReturnType<typeof usePracticeConfiguration>,
  correct: boolean,
  chooseCorrect = false,
) {
  const sessionId = api.session!.id
  const question = api.session!.currentQuestion!
  const answer = chooseCorrect
    ? question.correctAnswer
    : question.choices.find((choice) => choice !== question.correctAnswer)!
  const action = {
    type: 'report',
    sessionId,
    result: {
      questionId: question.id,
      selectedAnswer: answer,
      selfReportedCorrect: correct,
    },
  } as const
  act(() => {
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
    expect(api.dispatchSession(action)).toBe(true)
    for (let repeat = 0; repeat < 20; repeat++)
      expect(api.dispatchSession(action)).toBe(false)
  })
  return action
}

test('an inverse review report updates only its original, mixes patterns, and preserves attribution after reload', () => {
  const native = similar.generateSimilarQuestion
  vi.spyOn(similar, 'generateSimilarQuestion').mockImplementation(
    (pattern, options) =>
      native(pattern, { ...options, strategy: 'fact-family', random: () => 0 }),
  )
  const progress = emptyProgress()
  const original = createMistakePattern({
    incorrectCount: 100,
    similarCorrectCount: 2,
  })
  const other = createMistakePattern({
    id: 'other-fact',
    operation: 'subtraction',
    firstOperand: 7,
    secondOperand: 3,
    correctAnswer: 4,
  })
  progress.mistakePatterns = [original, other]
  const { wrapper, data } = setup(progress)
  const first = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    expect(first.result.current.configureSession(plan)).toBe(true)
  })
  const question = first.result.current.session!.currentQuestion!
  expect(question.operation).toBe('subtraction')
  expect(question.mistakePatternId).toBe(original.id)
  const action = report(first.result.current, false, true)
  expect(first.result.current.progress.mistakePatterns).toEqual([
    {
      ...original,
      similarCorrectCount: 0,
      incorrectCount: 101,
      lastIncorrectAt: first.result.current.progress.attempts[0].attemptedAt,
    },
    other,
  ])
  expect(first.result.current.session!.currentQuestion!.mistakePatternId).toBe(
    other.id,
  )
  expect(first.result.current.progress.attempts[0]).toMatchObject({
    mistakePatternId: original.id,
    operation: 'subtraction',
    selectedAnswer: question.correctAnswer,
    selfReportedCorrect: false,
  })
  const snapshot = first.result.current.progress
  first.unmount()
  const loaded = renderHook(usePracticeConfiguration, { wrapper })
  expect(loaded.result.current.progress).toEqual(snapshot)
  expect(JSON.parse(data.get(STORAGE_KEYS.sessions)!)[0]).not.toHaveProperty(
    'reviewQueue',
  )
  act(() => {
    expect(loaded.result.current.dispatchSession(action)).toBe(false)
  })
  expect(loaded.result.current.progress.mistakePatterns[0].incorrectCount).toBe(
    101,
  )
})

test('self-reported correct reviews master exactly once, persist, and a later regular mistake reactivates the original', () => {
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern()]
  const { wrapper, data } = setup(progress)
  const first = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    first.result.current.configureSession(plan)
  })
  for (let count = 1; count <= 3; count++) {
    report(first.result.current, true, false)
    expect(first.result.current.progress.mistakePatterns[0]).toMatchObject({
      similarCorrectCount: count,
      mastered: count === 3,
    })
  }
  const completed = first.result.current.session!
  expect(completed).toMatchObject({
    isActive: false,
    attempted: 3,
    correct: 3,
    incorrect: 0,
  })
  expect(
    first.result.current.progress.attempts.every(
      (attempt) => attempt.selectedAnswer !== attempt.correctAnswer,
    ),
  ).toBe(true)
  expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)[0].mastered).toBe(
    true,
  )
  act(() => {
    expect(first.result.current.configureSession(plan)).toBe(false)
    expect(first.result.current.restartSession(completed.id)).toBe(false)
  })
  expect(first.result.current.session).toBe(completed)
  first.unmount()
  const loaded = renderHook(usePracticeConfiguration, { wrapper })
  expect(loaded.result.current.progress.mistakePatterns[0]).toMatchObject({
    mastered: true,
    similarCorrectCount: 3,
  })
  vi.spyOn(regular, 'generateQuestion').mockReturnValue(createQuestion())
  act(() => {
    loaded.result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
  })
  report(loaded.result.current, false, true)
  expect(loaded.result.current.progress.mistakePatterns).toHaveLength(1)
  expect(loaded.result.current.progress.mistakePatterns[0]).toMatchObject({
    id: 'mistake-one',
    incorrectCount: 2,
    mastered: false,
    similarCorrectCount: 0,
  })
  act(() => {
    expect(loaded.result.current.configureSession(plan)).toBe(true)
  })
  expect(loaded.result.current.session?.mode).toBe('mistake-review')
})

test('uses a saved custom threshold and preserves mastery when resetting statistics', () => {
  const progress = emptyProgress()
  progress.settings.masteryThreshold = 2
  progress.mistakePatterns = [createMistakePattern({ similarCorrectCount: 1 })]
  const { wrapper } = setup(progress)
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession(plan)
  })
  report(result.current, true)
  expect(result.current.progress.mistakePatterns[0]).toMatchObject({
    mastered: true,
    similarCorrectCount: 2,
  })
  const patterns = result.current.progress.mistakePatterns
  act(() => {
    result.current.resetStatistics()
  })
  expect(result.current.progress.mistakePatterns).toEqual(patterns)
  expect(result.current.progress.settings.masteryThreshold).toBe(2)
  act(() => {
    result.current.clearAllData()
  })
  expect(result.current.progress.mistakePatterns).toEqual([])
  expect(result.current.progress.settings.masteryThreshold).toBe(3)
})

test('storage failure keeps review mastery usable in memory and a later save persists it once', () => {
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern()]
  const { wrapper, access, data } = setup(progress)
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
  report(result.current, true)
  expect(result.current.progress.mistakePatterns[0].similarCorrectCount).toBe(1)
  expect(
    JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)[0].similarCorrectCount,
  ).toBe(0)
  expect(result.current.storageWarning).toMatch(/can’t save/)
  access.setItem.mockImplementation(write)
  act(() => {
    result.current.patchSettings({ animationsEnabled: false })
  })
  expect(result.current.storageWarning).toBeNull()
  expect(
    JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)[0].similarCorrectCount,
  ).toBe(1)
})

test('reset and clear invalidate active review callbacks without restoring erased progress', () => {
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern()]
  const { wrapper } = setup(progress)
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession(plan)
  })
  const session = result.current.session!
  const question = session.currentQuestion!
  const action = {
    type: 'report',
    sessionId: session.id,
    result: {
      questionId: question.id,
      selectedAnswer: question.correctAnswer,
      selfReportedCorrect: true,
    },
  } as const
  act(() => {
    result.current.dispatchSession({
      type: 'select',
      sessionId: session.id,
      questionId: question.id,
      answer: question.correctAnswer,
    })
    result.current.dispatchSession({
      type: 'reveal',
      sessionId: session.id,
      questionId: question.id,
      answer: question.correctAnswer,
    })
    result.current.resetStatistics()
    expect(result.current.dispatchSession(action)).toBe(false)
  })
  expect(result.current.progress.mistakePatterns[0].similarCorrectCount).toBe(0)
  act(() => {
    result.current.clearAllData()
    expect(result.current.dispatchSession(action)).toBe(false)
  })
  expect(result.current.progress.mistakePatterns).toEqual([])
})

test('selecting and revealing a review answer do not change saved mastery', () => {
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern()]
  const { wrapper, data } = setup(progress)
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession(plan)
  })
  const session = result.current.session!
  const question = session.currentQuestion!
  const before = data.get(STORAGE_KEYS.mistakePatterns)
  act(() => {
    result.current.dispatchSession({
      type: 'select',
      sessionId: session.id,
      questionId: question.id,
      answer: question.correctAnswer,
    })
    result.current.dispatchSession({
      type: 'reveal',
      sessionId: session.id,
      questionId: question.id,
      answer: question.correctAnswer,
    })
  })
  expect(data.get(STORAGE_KEYS.mistakePatterns)).toBe(before)
  expect(result.current.progress.attempts).toHaveLength(0)
})
