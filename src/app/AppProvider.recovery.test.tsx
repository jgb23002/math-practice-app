import { StrictMode, type PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import {
  createProgressPersistence,
  withSessionProgress,
} from '../services/progressPersistence'
import * as questionGenerator from '../services/questionGenerator'
import { createMistakePattern } from '../test/mistakeFixtures'
import {
  recoveryFixture,
  recoverySnapshot,
  reportRecoveryAnswer,
} from '../test/recoveryFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import type { PracticeSessionAction } from '../types/session'
import AppProvider from './AppProvider'

afterEach(() => vi.restoreAllMocks())

function recoveryHook(storage: ReturnType<typeof memoryStorage>['storage']) {
  return renderHook(usePracticeConfiguration, {
    wrapper: ({ children }: PropsWithChildren) => (
      <StrictMode>
        <AppProvider storage={storage}>{children}</AppProvider>
      </StrictMode>
    ),
  })
}

test.each([5, 10, 20, 'continuous'] as const)(
  'refresh preserves a %s session through multiple recorded and unrecorded cards',
  (length) => {
    const { storage, data } = memoryStorage()
    const { session, dependencies } = recoveryFixture(length)
    const progressed = reportRecoveryAnswer(session, dependencies, false)
    const snapshot = recoverySnapshot(progressed)
    createProgressPersistence(storage).saveSession(
      snapshot.progress,
      progressed,
    )
    const generate = vi.spyOn(questionGenerator, 'generateQuestion')
    let hook = recoveryHook(storage)
    expect(hook.result.current.session).toEqual(progressed)
    expect(generate).not.toHaveBeenCalled()
    const current = progressed.currentQuestion!
    const action = {
      sessionId: session.id,
      questionId: current.id,
      answer: current.choices[0],
    }
    act(() => {
      hook.result.current.dispatchSession({ type: 'select', ...action })
    })
    hook.unmount()
    hook = recoveryHook(storage)
    expect(hook.result.current.session?.selectedAnswer).toBe(action.answer)
    expect(hook.result.current.session?.isAnswerRevealed).toBe(false)
    act(() => {
      hook.result.current.dispatchSession({ type: 'reveal', ...action })
    })
    hook.unmount()
    hook = recoveryHook(storage)
    expect(hook.result.current.session).toMatchObject({
      selectedAnswer: action.answer,
      isAnswerRevealed: true,
      attempted: 1,
      incorrect: 1,
    })
    expect(hook.result.current.progress.statistics.attempted).toBe(1)
    const report: PracticeSessionAction = {
      type: 'report',
      sessionId: session.id,
      result: {
        questionId: current.id,
        selectedAnswer: action.answer,
        selfReportedCorrect: true,
      },
    }
    act(() => {
      const staleDispatch = hook.result.current.dispatchSession
      expect(staleDispatch(report)).toBe(true)
      expect(staleDispatch(report)).toBe(false)
      // Check the checkpoint before React commits a render/effect.
      expect(
        JSON.parse(data.get(STORAGE_KEYS.activeSession)!).session.attempted,
      ).toBe(2)
    })
    hook.unmount()
    hook = recoveryHook(storage)
    act(() => {
      expect(hook.result.current.dispatchSession(report)).toBe(false)
    })
    expect(hook.result.current.session).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
      selectedAnswer: null,
      isAnswerRevealed: false,
    })
    expect(hook.result.current.progress.statistics).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(hook.result.current.progress.attempts).toHaveLength(2)
    expect(hook.result.current.progress.mistakePatterns[0].incorrectCount).toBe(
      1,
    )
  },
)

test.each([5, 10, 20, 'continuous'] as const)(
  'completion clears %s recovery and remains recorded exactly once after remount',
  (length) => {
    const { storage, data } = memoryStorage()
    const { session, dependencies } = recoveryFixture(length)
    let current = session
    const target = length === 'continuous' ? 3 : length - 1
    for (let count = 0; count < target; count++)
      current = reportRecoveryAnswer(current, dependencies, count % 2 === 0)
    const snapshot = recoverySnapshot(current)
    createProgressPersistence(storage).saveSession(snapshot.progress, current)
    const hook = recoveryHook(storage)
    const question = current.currentQuestion!
    const answer = question.choices[0]
    const action =
      length === 'continuous'
        ? { type: 'end' as const, sessionId: current.id }
        : {
            type: 'report' as const,
            sessionId: current.id,
            result: {
              questionId: question.id,
              selectedAnswer: answer,
              selfReportedCorrect: true,
            },
          }
    act(() => {
      hook.result.current.dispatchSession({
        type: 'select',
        sessionId: current.id,
        questionId: question.id,
        answer,
      })
      hook.result.current.dispatchSession({
        type: 'reveal',
        sessionId: current.id,
        questionId: question.id,
        answer,
      })
      expect(hook.result.current.dispatchSession(action)).toBe(true)
      expect(hook.result.current.dispatchSession(action)).toBe(false)
    })
    expect(data.has(STORAGE_KEYS.activeSession)).toBe(false)
    const completed = hook.result.current.progress
    expect(completed.sessions).toHaveLength(1)
    expect(completed.sessions[0].completedAt).toBeTruthy()
    expect(completed.attempts).toHaveLength(
      length === 'continuous' ? target : length,
    )
    hook.unmount()
    const reloaded = recoveryHook(storage)
    expect(reloaded.result.current.session).toBeNull()
    expect(reloaded.result.current.progress).toEqual(completed)
  },
)

test('review queue, attribution and mastery survive refresh without recounting successful reviews', () => {
  const { storage, data } = memoryStorage()
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern()]
  createProgressPersistence(storage).save(progress)
  let hook = recoveryHook(storage)
  act(() => {
    expect(
      hook.result.current.configureSession({
        mode: 'mistake-review',
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
      }),
    ).toBe(true)
  })
  for (let count = 1; count <= 3; count++) {
    const session = hook.result.current.session!
    const question = session.currentQuestion!
    // An incorrect selected option still counts as a correct self-report.
    const answer = question.choices.find(
      (choice) => choice !== question.correctAnswer,
    )!
    act(() => {
      hook.result.current.dispatchSession({
        type: 'select',
        sessionId: session.id,
        questionId: question.id,
        answer,
      })
      hook.result.current.dispatchSession({
        type: 'reveal',
        sessionId: session.id,
        questionId: question.id,
        answer,
      })
    })
    const saved = structuredClone(hook.result.current.session)
    hook.unmount()
    hook = recoveryHook(storage)
    expect(hook.result.current.session).toEqual(saved)
    const report: PracticeSessionAction = {
      type: 'report',
      sessionId: session.id,
      result: {
        questionId: question.id,
        selectedAnswer: answer,
        selfReportedCorrect: true,
      },
    }
    act(() => {
      expect(hook.result.current.dispatchSession(report)).toBe(true)
      expect(hook.result.current.dispatchSession(report)).toBe(false)
    })
    expect(hook.result.current.progress.mistakePatterns[0]).toMatchObject({
      similarCorrectCount: count,
      incorrectCount: 1,
      mastered: count === 3,
    })
    expect(hook.result.current.progress.attempts).toHaveLength(count)
    expect(
      hook.result.current.progress.attempts.every(
        (attempt) =>
          attempt.mistakePatternId === 'mistake-one' &&
          attempt.selfReportedCorrect,
      ),
    ).toBe(true)
  }
  expect(data.has(STORAGE_KEYS.activeSession)).toBe(false)
  hook.unmount()
  hook = recoveryHook(storage)
  expect(hook.result.current.session).toBeNull()
  expect(
    hook.result.current.progress.mistakePatterns[0].similarCorrectCount,
  ).toBe(3)
})

test('multiple-pattern review keeps its queue and records a restored incorrect review against its original pattern once', () => {
  const { storage } = memoryStorage()
  const progress = emptyProgress()
  progress.mistakePatterns = [
    createMistakePattern(),
    createMistakePattern({
      id: 'second-pattern',
      firstOperand: 2,
      secondOperand: 4,
      correctAnswer: 6,
    }),
  ]
  createProgressPersistence(storage).save(progress)
  let hook = recoveryHook(storage)
  act(() => {
    hook.result.current.configureSession({
      mode: 'mistake-review',
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 10,
    })
  })
  const saved = structuredClone(hook.result.current.session!)
  expect(saved.reviewQueue).toHaveLength(1)
  hook.unmount()
  hook = recoveryHook(storage)
  expect(hook.result.current.session).toEqual(saved)
  const question = saved.currentQuestion!
  const action = {
    sessionId: saved.id,
    questionId: question.id,
    answer: question.correctAnswer,
  }
  act(() => {
    hook.result.current.dispatchSession({ type: 'select', ...action })
    hook.result.current.dispatchSession({ type: 'reveal', ...action })
  })
  hook.unmount()
  hook = recoveryHook(storage)
  const report: PracticeSessionAction = {
    type: 'report',
    sessionId: saved.id,
    result: {
      questionId: question.id,
      selectedAnswer: question.correctAnswer,
      selfReportedCorrect: false,
    },
  }
  act(() => {
    expect(hook.result.current.dispatchSession(report)).toBe(true)
    expect(hook.result.current.dispatchSession(report)).toBe(false)
  })
  expect(hook.result.current.progress.mistakePatterns).toHaveLength(2)
  expect(
    hook.result.current.progress.mistakePatterns.find(
      (p) => p.id === question.mistakePatternId,
    ),
  ).toMatchObject({
    incorrectCount: 2,
    similarCorrectCount: 0,
    mastered: false,
  })
  expect(hook.result.current.session?.currentQuestion?.mistakePatternId).toBe(
    saved.reviewQueue![0],
  )
  hook.unmount()
  hook = recoveryHook(storage)
  expect(hook.result.current.progress.statistics).toMatchObject({
    attempted: 1,
    incorrect: 1,
    correct: 0,
  })
  expect(
    hook.result.current.progress.mistakePatterns.find(
      (p) => p.id === question.mistakePatternId,
    )?.incorrectCount,
  ).toBe(2)
})

test.each(['resetStatistics', 'clearAllData'] as const)(
  '%s invalidates recovered callbacks and removes the checkpoint',
  (clear) => {
    const { storage, data } = memoryStorage()
    const { session, dependencies } = recoveryFixture()
    const next = reportRecoveryAnswer(session, dependencies)
    const snapshot = recoverySnapshot(next)
    createProgressPersistence(storage).saveSession(snapshot.progress, next)
    const hook = recoveryHook(storage)
    act(() => {
      expect(hook.result.current[clear]()).toBe(true)
      expect(hook.result.current.getActiveSession()).toBeNull()
      expect(
        hook.result.current.dispatchSession({
          type: 'end',
          sessionId: session.id,
        }),
      ).toBe(false)
    })
    expect(data.has(STORAGE_KEYS.activeSession)).toBe(false)
    expect(hook.result.current.progress.statistics.attempted).toBe(0)
    hook.unmount()
    expect(recoveryHook(storage).result.current.session).toBeNull()
  },
)

test('a recovered failed question can retry without losing earlier totals', () => {
  const { storage } = memoryStorage()
  const { session, dependencies } = recoveryFixture()
  const next = {
    ...reportRecoveryAnswer(session, dependencies),
    currentQuestion: null,
    questionError: 'Try again.',
  }
  createProgressPersistence(storage).saveSession(
    withSessionProgress(emptyProgress(), next),
    next,
  )
  const hook = recoveryHook(storage)
  expect(hook.result.current.session?.questionError).toBe('Try again.')
  act(() => {
    expect(
      hook.result.current.dispatchSession({
        type: 'retry',
        sessionId: session.id,
      }),
    ).toBe(true)
  })
  expect(hook.result.current.session?.currentQuestion).toBeTruthy()
  expect(hook.result.current.session?.attempted).toBe(1)
  expect(hook.result.current.progress.statistics.attempted).toBe(1)
})

test('storage failure still allows in-memory practice with a save warning', () => {
  const { storage, access } = memoryStorage()
  const hook = recoveryHook(storage)
  access.setItem.mockImplementation(() => {
    throw new Error('Full')
  })
  act(() => {
    expect(
      hook.result.current.configureSession({
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
      }),
    ).toBe(true)
  })
  expect(hook.result.current.session?.currentQuestion).toBeTruthy()
  expect(hook.result.current.storageWarning).toMatch(/can’t save your progress/)
})
