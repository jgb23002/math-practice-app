import { expect, test, vi } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import type { MistakePattern } from '../types/mistake'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import { recordMistakes } from './mistakeTracking'
import {
  createPracticeSession,
  transitionPracticeSession,
} from './practiceSession'
import { generateSimilarQuestion } from './similarQuestionGenerator'

const plan: PracticeConfiguration = {
  mode: 'mistake-review',
  operations: ['addition', 'subtraction'],
  difficulty: 1,
  sessionLength: 'continuous',
}
function harness(
  patterns: MistakePattern[],
  masteryThreshold = 3,
  configuration = plan,
  generateSimilar = generateSimilarQuestion,
) {
  let id = 0
  const dependencies = {
    mistakePatterns: patterns,
    masteryThreshold,
    generateSimilar,
    createId: () => `id-${++id}`,
    random: () => 0,
    now: () => '2026-10-21T12:00:00.000Z',
  }
  let session = createPracticeSession(configuration, dependencies)
  return {
    dependencies,
    get session() {
      return session
    },
    dispatch(action: Parameters<typeof transitionPracticeSession>[1]) {
      const next = transitionPracticeSession(session, action, dependencies)
      const added = next.attempts.slice(session.attempts.length)
      dependencies.mistakePatterns = recordMistakes(
        dependencies.mistakePatterns,
        added,
        masteryThreshold,
      )
      session = next
    },
    report(correct = true, chooseCorrect = false) {
      const question = session.currentQuestion!
      const answer = chooseCorrect
        ? question.correctAnswer
        : question.choices.find((choice) => choice !== question.correctAnswer)!
      this.dispatch({
        type: 'select',
        sessionId: session.id,
        questionId: question.id,
        answer,
      })
      this.dispatch({
        type: 'reveal',
        sessionId: session.id,
        questionId: question.id,
        answer,
      })
      const action = {
        type: 'report',
        sessionId: session.id,
        result: {
          questionId: question.id,
          selectedAnswer: answer,
          selfReportedCorrect: correct,
        },
      } as const
      this.dispatch(action)
      return action
    },
  }
}

test('review rounds prioritize difficult patterns and cover every eligible pattern without starving others', () => {
  const patterns = [
    createMistakePattern({ id: 'low', firstOperand: 2, correctAnswer: 6 }),
    createMistakePattern({ id: 'high', incorrectCount: 30 }),
    createMistakePattern({
      id: 'middle',
      operation: 'subtraction',
      firstOperand: 7,
      secondOperand: 3,
      correctAnswer: 4,
      incorrectCount: 5,
    }),
    createMistakePattern({
      id: 'mastered',
      mastered: true,
      similarCorrectCount: 3,
      incorrectCount: 100,
    }),
    createMistakePattern({
      id: 'different-level',
      difficulty: 2,
      incorrectCount: 100,
    }),
    createMistakePattern({
      id: 'unselected',
      operation: 'multiplication',
      correctAnswer: 12,
      incorrectCount: 100,
    }),
  ]
  const app = harness(patterns)
  expect(app.session.currentQuestion?.mistakePatternId).toBe('high')
  for (let round = 0; round < 3; round++) {
    const ids: string[] = []
    for (let index = 0; index < 3; index++) {
      ids.push(app.session.currentQuestion!.mistakePatternId!)
      expect(app.session.currentQuestion!.source).toBe('mistake-review')
      expect(plan.operations).toContain(app.session.currentQuestion!.operation)
      app.report(false, true)
    }
    expect(new Set(ids)).toEqual(new Set(['high', 'middle', 'low']))
  }
})

test.each([5, 10, 20, 'continuous'] as const)(
  '%s review ends as soon as all matching patterns are mastered and latches completion',
  (sessionLength) => {
    const original = createMistakePattern()
    const app = harness([original], 3, { ...plan, sessionLength })
    let lastAction: ReturnType<typeof app.report> | undefined
    for (let index = 0; index < 3; index++) lastAction = app.report(true, false)
    expect(app.session).toMatchObject({
      attempted: 3,
      correct: 3,
      incorrect: 0,
      isActive: false,
      currentQuestion: null,
    })
    expect(app.dependencies.mistakePatterns).toEqual([
      { ...original, similarCorrectCount: 3, mastered: true },
    ])
    expect(
      app.session.attempts.every(
        (attempt) =>
          attempt.mistakePatternId === original.id &&
          attempt.source === 'mistake-review',
      ),
    ).toBe(true)
    const completed = app.session
    for (let repeat = 0; repeat < 20; repeat++) app.dispatch(lastAction!)
    expect(app.session).toBe(completed)
  },
)

test('does not generate another question for a newly mastered pattern when other patterns remain', () => {
  const first = createMistakePattern({ id: 'high', incorrectCount: 100 })
  const second = createMistakePattern({
    id: 'low',
    firstOperand: 2,
    correctAnswer: 6,
  })
  const app = harness([first, second], 1)
  expect(app.session.currentQuestion?.mistakePatternId).toBe(first.id)
  app.report()
  expect(app.session.currentQuestion?.mistakePatternId).toBe(second.id)
  expect(app.dependencies.mistakePatterns[0].mastered).toBe(true)
})

test('selection and reveal change neither mastery nor attempts; rejected reports do not advance', () => {
  const original = createMistakePattern()
  const app = harness([original])
  const question = app.session.currentQuestion!
  const action = {
    type: 'report',
    sessionId: app.session.id,
    result: {
      questionId: question.id,
      selectedAnswer: question.correctAnswer,
      selfReportedCorrect: true,
    },
  } as const
  app.dispatch(action)
  app.dispatch({
    type: 'select',
    sessionId: app.session.id,
    questionId: question.id,
    answer: question.correctAnswer,
  })
  app.dispatch(action)
  app.dispatch({
    type: 'reveal',
    sessionId: app.session.id,
    questionId: question.id,
    answer: question.correctAnswer,
  })
  expect(app.session.attempts).toEqual([])
  expect(app.dependencies.mistakePatterns).toEqual([original])
  app.dispatch(action)
  expect(app.dependencies.mistakePatterns[0].similarCorrectCount).toBe(1)
})

test('generation failure preserves the accepted report and retry does not recount it', () => {
  const generate = vi.fn(generateSimilarQuestion)
  const app = harness([createMistakePattern()], 3, plan, generate)
  generate.mockImplementationOnce(() => {
    throw new Error('No card')
  })
  app.report()
  expect(app.session.currentQuestion).toBeNull()
  expect(app.session.questionError).toMatch(/tangled/)
  expect(app.dependencies.mistakePatterns[0].similarCorrectCount).toBe(1)
  app.dispatch({ type: 'retry', sessionId: app.session.id })
  expect(app.session.currentQuestion).not.toBeNull()
  expect(app.session.attempts).toHaveLength(1)
  expect(app.dependencies.mistakePatterns[0].similarCorrectCount).toBe(1)
})

test('rejects a generator returning another pattern attribution or operation', () => {
  for (const patch of [
    { mistakePatternId: 'wrong' },
    { source: 'regular' as const },
    { difficulty: 2 as const },
  ]) {
    const generate = (pattern: MistakePattern) => ({
      ...generateSimilarQuestion(pattern),
      ...patch,
    })
    const app = harness([createMistakePattern()], 3, plan, generate)
    expect(app.session.currentQuestion).toBeNull()
    expect(app.session.questionError).not.toBeNull()
  }
})

test('refuses empty, mastered-only, or nonmatching review sessions', () => {
  for (const patterns of [
    [],
    [createMistakePattern({ mastered: true })],
    [createMistakePattern({ difficulty: 2 })],
  ])
    expect(() =>
      createPracticeSession(plan, { mistakePatterns: patterns }),
    ).toThrow(RangeError)
})
