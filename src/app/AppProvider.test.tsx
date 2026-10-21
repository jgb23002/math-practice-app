import { act, renderHook } from '@testing-library/react'
import { StrictMode, type PropsWithChildren } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import * as questionGenerator from '../services/questionGenerator'
import { createQuestion } from '../test/questionFixtures'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

test('stores an independent validated snapshot and rejects invalid replacements', () => {
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  const candidate = {
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 10,
  }
  expect(result.current.configuration).toBeNull()
  act(() => {
    expect(result.current.configureSession(candidate)).toBe(true)
  })
  candidate.operations.push('division')
  expect(result.current.configuration?.operations).toEqual(['addition'])
  act(() => {
    expect(
      result.current.configureSession({ ...candidate, operations: [] }),
    ).toBe(false)
  })
  expect(result.current.configuration).toEqual({
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 10,
  })
})

test('commits synchronously so stale callbacks cannot double count within a React batch or a new session', () => {
  let count = 0
  const generate = vi
    .spyOn(questionGenerator, 'generateQuestion')
    .mockImplementation(() =>
      createQuestion({
        id: `question-${++count}`,
        firstOperand: count % 2 === 1 ? 3 : 4,
        correctAnswer: count % 2 === 1 ? 7 : 8,
        displayText: count % 2 === 1 ? '3 + 4 = ?' : '4 + 4 = ?',
        choices: [6, 7, 8, 9],
      }),
    )
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <AppProvider>{children}</AppProvider>
    </StrictMode>
  )
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
  })
  const session = result.current.session!
  const dispatch = result.current.dispatchSession
  const questionId = session.currentQuestion!.id
  const report = {
    type: 'report',
    sessionId: session.id,
    result: { questionId, selectedAnswer: 6, selfReportedCorrect: true },
  } as const
  act(() => {
    expect(dispatch(report)).toBe(false)
    dispatch({ type: 'select', sessionId: session.id, questionId, answer: 6 })
    expect(dispatch(report)).toBe(false)
    dispatch({ type: 'reveal', sessionId: session.id, questionId, answer: 6 })
    expect(dispatch(report)).toBe(true)
    expect(dispatch(report)).toBe(false)
  })
  expect(result.current.session).toMatchObject({
    attempted: 1,
    correct: 1,
    incorrect: 0,
    currentQuestionIndex: 1,
    selectedAnswer: null,
    isAnswerRevealed: false,
  })
  expect(result.current.session!.attempts).toHaveLength(1)
  expect(generate).toHaveBeenCalledTimes(2)
  act(() => {
    result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
    expect(dispatch(report)).toBe(false)
  })
  expect(result.current.session!.id).not.toBe(session.id)
  expect(result.current.session!.attempted).toBe(0)
})
