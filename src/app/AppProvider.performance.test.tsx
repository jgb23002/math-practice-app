import { act, render, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import { largeHistoryFixture } from '../test/largeHistoryFixture'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import { calculateStatistics } from '../utils/statistics'
import {
  saveStoredProgress,
  withSessionProgress,
} from '../services/progressPersistence'
import * as generator from '../services/questionGenerator'
import {
  recoveryFixture,
  recoverySnapshot,
  reportRecoveryAnswer,
} from '../test/recoveryFixtures'
import { STORAGE_KEYS } from '../config/storage'
import { useApplicationStatus } from './ApplicationStatusContext'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

test('selection and revealing preserve history references and save one checkpoint per action', () => {
  const { storage } = memoryStorage()
  const history = largeHistoryFixture()
  const progress = {
    ...emptyProgress(),
    ...history,
    statistics: calculateStatistics(history.attempts),
  }
  expect(saveStoredProgress(storage, progress)).toBe(true)
  const write = vi.spyOn(storage, 'write')
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider storage={storage}>{children}</AppProvider>
  )
  const { result } = renderHook(usePracticeConfiguration, { wrapper })
  act(() => {
    result.current.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
  })
  const before = result.current
  const session = before.session!
  const question = session.currentQuestion!
  write.mockClear()
  act(() => {
    result.current.dispatchSession({
      type: 'select',
      sessionId: session.id,
      questionId: question.id,
      answer: question.choices[0],
    })
  })
  const afterSelect = result.current
  act(() => {
    result.current.dispatchSession({
      type: 'reveal',
      sessionId: session.id,
      questionId: question.id,
      answer: question.choices[0],
    })
  })
  expect(afterSelect.progress).toBe(before.progress)
  expect(result.current.progress).toBe(before.progress)
  for (const action of [
    'getActiveSession',
    'saveCurrentSession',
    'dispatchSession',
    'configureSession',
    'patchSettings',
    'updateSettings',
    'resetStatistics',
    'clearAllData',
    'restartSession',
  ] as const)
    expect(result.current[action]).toBe(before[action])
  expect(
    write.mock.calls.filter(([key]) => key === STORAGE_KEYS.activeSession),
  ).toHaveLength(2)
  expect(afterSelect.session?.selectedAnswer).toBe(question.choices[0])
  expect(result.current.session?.isAnswerRevealed).toBe(true)
  expect(result.current.progress.statistics.attempted).toBe(5000)
  write.mockClear()
  const revealed = result.current
  act(() => {
    expect(
      result.current.patchSettings({
        animationsEnabled: revealed.progress.settings.animationsEnabled,
      }),
    ).toBe(true)
  })
  expect(result.current).toBe(revealed)
  expect(write).not.toHaveBeenCalled()
  const report = {
    type: 'report',
    sessionId: session.id,
    result: {
      questionId: question.id,
      selectedAnswer: question.choices[0],
      selfReportedCorrect: true,
    },
  } as const
  act(() => {
    expect(result.current.dispatchSession(report)).toBe(true)
    expect(result.current.dispatchSession(report)).toBe(false)
  })
  expect(result.current.progress.statistics.attempted).toBe(5001)
  expect(result.current.progress.attempts).toHaveLength(5001)
  expect(result.current.progress.attempts.slice(0, 5000)).toEqual(
    before.progress.attempts,
  )
  expect(
    write.mock.calls.filter(([key]) => key === STORAGE_KEYS.activeSession),
  ).toHaveLength(1)
})

test('routine session actions do not re-render application status consumers or generate extra questions', () => {
  const generated = vi.spyOn(generator, 'generateQuestion')
  let renders = 0
  let api: ReturnType<typeof usePracticeConfiguration>
  function Status() {
    useApplicationStatus()
    renders++
    return null
  }
  function Session() {
    api = usePracticeConfiguration()
    return null
  }
  render(
    <AppProvider>
      <Status />
      <Session />
    </AppProvider>,
  )
  expect(generated).not.toHaveBeenCalled()
  const initialRenders = renders
  act(() => {
    api.configureSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
  })
  const countAfterStart = generated.mock.calls.length
  expect(countAfterStart).toBeGreaterThan(0)
  const { id, currentQuestion } = api!.session!
  const action = {
    sessionId: id,
    questionId: currentQuestion!.id,
    answer: currentQuestion!.choices[0],
  }
  act(() => {
    api.dispatchSession({ ...action, type: 'select' })
  })
  act(() => {
    expect(api.dispatchSession({ ...action, type: 'select' })).toBe(false)
  })
  act(() => {
    api.dispatchSession({ ...action, type: 'reveal' })
  })
  act(() => {
    api.patchSettings({ animationsEnabled: false })
  })
  expect(renders).toBe(initialRenders)
  expect(generated).toHaveBeenCalledTimes(countAfterStart)
})

test('an older recovery cursor generates its next question in an effect, outside rendering', () => {
  const { session, dependencies } = recoveryFixture()
  const snapshot = recoverySnapshot(session)
  const next = reportRecoveryAnswer(session, dependencies, true)
  const durable = withSessionProgress(snapshot.progress, next)
  const { storage, data } = memoryStorage()
  expect(saveStoredProgress(storage, durable)).toBe(true)
  data.set(STORAGE_KEYS.activeSession, JSON.stringify(snapshot))
  const generated = vi.spyOn(generator, 'generateQuestion')
  renderToString(
    <AppProvider storage={storage}>
      <span>Recovery</span>
    </AppProvider>,
  )
  expect(generated).not.toHaveBeenCalled()
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider storage={storage}>{children}</AppProvider>
  )
  const { result, rerender } = renderHook(usePracticeConfiguration, { wrapper })
  expect(result.current.session?.currentQuestion).not.toBeNull()
  expect(result.current.session?.attempted).toBe(1)
  expect(result.current.progress.statistics.attempted).toBe(1)
  const calls = generated.mock.calls.length
  expect(calls).toBeGreaterThan(0)
  rerender()
  expect(generated).toHaveBeenCalledTimes(calls)
})
