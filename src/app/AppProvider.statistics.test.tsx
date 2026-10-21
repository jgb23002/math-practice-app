import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import * as questionGenerator from '../services/questionGenerator'
import { createQuestion } from '../test/questionFixtures'
import { createEmptyStatistics } from '../utils/statistics'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

test('reset invalidates active and stale callbacks, clears totals, and preserves configuration and settings', () => {
  let count = 0
  const generate = vi
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
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  act(() => {
    result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
    result.current.updateSettings({
      ...result.current.progress.settings,
      animationsEnabled: false,
    })
  })
  const sessionId = result.current.session!.id
  const dispatch = result.current.dispatchSession
  function selectReveal(questionId: string) {
    dispatch({ type: 'select', sessionId, questionId, answer: 6 })
    dispatch({ type: 'reveal', sessionId, questionId, answer: 6 })
  }
  act(() => {
    selectReveal('question-1')
    dispatch({
      type: 'report',
      sessionId,
      result: {
        questionId: 'question-1',
        selectedAnswer: 6,
        selfReportedCorrect: true,
      },
    })
    selectReveal('question-2')
  })
  expect(result.current.progress.statistics.attempted).toBe(1)
  const settings = structuredClone(result.current.progress.settings)
  const configuration = result.current.configuration
  const staleReport = {
    type: 'report',
    sessionId,
    result: {
      questionId: 'question-2',
      selectedAnswer: 6,
      selfReportedCorrect: false,
    },
  } as const
  act(() => {
    expect(result.current.resetStatistics()).toBe(true)
    expect(dispatch(staleReport)).toBe(false)
    expect(dispatch({ type: 'end', sessionId })).toBe(false)
  })
  expect(result.current.session).toBeNull()
  expect(result.current.configuration).toBe(configuration)
  expect(result.current.progress).toEqual({
    settings,
    sessions: [],
    attempts: [],
    mistakePatterns: [],
    statistics: createEmptyStatistics(),
  })
  expect(generate).toHaveBeenCalledTimes(2)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  act(() => {
    result.current.configureSession(configuration)
    expect(dispatch(staleReport)).toBe(false)
  })
  expect(result.current.progress.sessions).toHaveLength(1)
  expect(result.current.progress.sessions[0]).toMatchObject({
    attempted: 0,
    correct: 0,
    incorrect: 0,
  })
  expect(result.current.progress.statistics.attempted).toBe(0)
})
