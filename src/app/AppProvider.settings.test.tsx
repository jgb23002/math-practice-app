import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createDefaultSettings } from '../config/storage'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import * as sound from '../services/practiceSound'
import * as generator from '../services/questionGenerator'
import { createDefaultProgress } from '../services/progressPersistence'
import { createQuestion } from '../test/questionFixtures'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

function questions() {
  let count = 0
  vi.spyOn(generator, 'generateQuestion').mockImplementation(() => {
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

test('batched preference patches preserve each change and validate the mastery threshold', () => {
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  act(() => {
    result.current.patchSettings({ soundEnabled: true })
    result.current.patchSettings({ animationsEnabled: false })
    result.current.patchSettings({
      showExplanations: false,
      masteryThreshold: 5,
    })
    expect(result.current.patchSettings({ masteryThreshold: 0 })).toBe(false)
    expect(result.current.patchSettings({ masteryThreshold: 1.5 })).toBe(false)
  })
  expect(result.current.progress.settings).toEqual({
    ...createDefaultSettings(),
    soundEnabled: true,
    animationsEnabled: false,
    showExplanations: false,
    masteryThreshold: 5,
  })
})

test('optional sound plays only for accepted reports, equally for both marks, and never for duplicates', () => {
  questions()
  const play = vi.spyOn(sound, 'playPracticeSound').mockResolvedValue(undefined)
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  act(() => {
    result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
  })
  expect(play).not.toHaveBeenCalled()
  for (const [enabled, correct] of [
    [false, true],
    [true, false],
    [true, true],
    [false, false],
  ]) {
    const session = result.current.session!
    const questionId = session.currentQuestion!.id
    const sessionId = session.id
    const dispatch = result.current.dispatchSession
    act(() => {
      result.current.patchSettings({ soundEnabled: enabled })
    })
    const before = play.mock.calls.length
    act(() => {
      dispatch({ type: 'select', sessionId, questionId, answer: 6 })
      dispatch({ type: 'reveal', sessionId, questionId, answer: 6 })
    })
    expect(play).toHaveBeenCalledTimes(before)
    act(() => {
      const report = {
        type: 'report',
        sessionId,
        result: { questionId, selectedAnswer: 6, selfReportedCorrect: correct },
      } as const
      expect(dispatch(report)).toBe(true)
      expect(dispatch(report)).toBe(false)
    })
    expect(play).toHaveBeenCalledTimes(before + Number(enabled))
  }
  expect(play).toHaveBeenCalledTimes(2)
})

test('clear all invalidates an active revealed card and restores the complete default state', () => {
  questions()
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  act(() => {
    result.current.patchSettings({
      animationsEnabled: false,
      defaultOperations: ['division'],
      defaultDifficulty: 3,
      masteryThreshold: 5,
    })
    result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
  })
  const sessionId = result.current.session!.id
  const questionId = result.current.session!.currentQuestion!.id
  const dispatch = result.current.dispatchSession
  act(() => {
    dispatch({ type: 'select', sessionId, questionId, answer: 6 })
    dispatch({ type: 'reveal', sessionId, questionId, answer: 6 })
    expect(result.current.clearAllData()).toBe(true)
    expect(
      dispatch({
        type: 'report',
        sessionId,
        result: { questionId, selectedAnswer: 6, selfReportedCorrect: true },
      }),
    ).toBe(false)
    expect(dispatch({ type: 'end', sessionId })).toBe(false)
  })
  expect(result.current.session).toBeNull()
  expect(result.current.configuration).toBeNull()
  expect(result.current.progress).toEqual(createDefaultProgress())
})
