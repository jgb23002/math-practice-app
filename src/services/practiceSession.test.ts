import { expect, test, vi } from 'vitest'
import { createQuestion } from '../test/questionFixtures'
import type { Question } from '../types/question'
import type {
  PracticeSessionState,
  PracticeSessionAction,
} from '../types/session'
import {
  createPracticeSession,
  MAX_REPEAT_ATTEMPTS,
  transitionPracticeSession,
} from './practiceSession'

function tools() {
  let questionId = 0
  let id = 0
  const generate = vi.fn(() => {
    const first = ++questionId % 2 === 1 ? 3 : 4
    const answer = first + 4
    return createQuestion({
      id: `question-${questionId}`,
      firstOperand: first,
      correctAnswer: answer,
      displayText: `${first} + 4 = ?`,
      choices: [answer - 1, answer, answer + 1, answer + 2],
    })
  })
  return {
    generate,
    createId: () => `id-${++id}`,
    now: () => '2026-10-20T12:00:00.000Z',
  }
}
const configuration = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 10,
}

function reveal(
  session: PracticeSessionState,
  dependencies: ReturnType<typeof tools>,
  answer = session.currentQuestion!.choices[0],
) {
  const questionId = session.currentQuestion!.id
  const selected = transitionPracticeSession(
    session,
    { type: 'select', sessionId: session.id, questionId, answer },
    dependencies,
  )
  return transitionPracticeSession(
    selected,
    { type: 'reveal', sessionId: session.id, questionId, answer },
    dependencies,
  )
}
function reportAction(
  session: PracticeSessionState,
  correct = true,
): PracticeSessionAction {
  return {
    type: 'report',
    sessionId: session.id,
    result: {
      questionId: session.currentQuestion!.id,
      selectedAnswer: session.selectedAnswer!,
      selfReportedCorrect: correct,
    },
  }
}

test('starts with a unique ID, cloned configuration, a first question, and zero totals', () => {
  const dependencies = tools()
  const candidate = { ...configuration, operations: ['addition'] }
  const session = createPracticeSession(candidate, dependencies)
  const another = createPracticeSession(configuration, dependencies)
  candidate.operations.push('division')
  expect(session.id).not.toBe(another.id)
  expect(session.operations).toEqual(['addition'])
  expect(session).toMatchObject({
    difficulty: 1,
    sessionLength: 10,
    currentQuestionIndex: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    isActive: true,
    selectedAnswer: null,
    isAnswerRevealed: false,
    attempts: [],
    startedAt: dependencies.now(),
  })
  expect(session.currentQuestion?.choices).toHaveLength(4)
})

test.each([
  null,
  {},
  { ...configuration, operations: [] },
  { ...configuration, difficulty: 5 },
  { ...configuration, sessionLength: 7 },
])('rejects invalid setup %j before generating a question', (candidate) => {
  const dependencies = tools()
  expect(() => createPracticeSession(candidate, dependencies)).toThrow(
    TypeError,
  )
  expect(dependencies.generate).not.toHaveBeenCalled()
})

test('selecting or revealing never records results, and an unrevealed report is rejected', () => {
  const dependencies = tools()
  const session = createPracticeSession(configuration, dependencies)
  const questionId = session.currentQuestion!.id
  const early = {
    type: 'report',
    sessionId: session.id,
    result: { questionId, selectedAnswer: 6, selfReportedCorrect: true },
  } as const
  expect(transitionPracticeSession(session, early, dependencies)).toBe(session)
  expect(
    transitionPracticeSession(session, {
      type: 'reveal',
      sessionId: session.id,
      questionId,
      answer: 6,
    }),
  ).toBe(session)
  expect(
    transitionPracticeSession(session, {
      type: 'select',
      sessionId: session.id,
      questionId,
      answer: 999,
    }),
  ).toBe(session)
  const selected = transitionPracticeSession(session, {
    type: 'select',
    sessionId: session.id,
    questionId,
    answer: 6,
  })
  expect(transitionPracticeSession(selected, early, dependencies)).toBe(
    selected,
  )
  const revealed = reveal(session, dependencies, 6)
  expect(revealed).toMatchObject({
    selectedAnswer: 6,
    isAnswerRevealed: true,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    attempts: [],
  })
  expect(dependencies.generate).toHaveBeenCalledOnce()
  expect(
    transitionPracticeSession(revealed, {
      type: 'select',
      sessionId: session.id,
      questionId,
      answer: 7,
    }),
  ).toBe(revealed)
})

test.each([5, 10, 20])(
  'records exactly %s self-reports, then completes without generating an extra card',
  (sessionLength) => {
    const dependencies = tools()
    let session = createPracticeSession(
      { ...configuration, sessionLength },
      dependencies,
    )
    for (let index = 0; index < sessionLength; index++) {
      const before = session
      session = reveal(session, dependencies)
      session = transitionPracticeSession(
        session,
        reportAction(session, index % 2 === 0),
        dependencies,
      )
      expect(session.attempted).toBe(index + 1)
      expect(before.attempted).toBe(index)
      expect(session.attempts).toHaveLength(index + 1)
      expect(session.correct + session.incorrect).toBe(session.attempted)
      expect(session.currentQuestionIndex).toBe(index + 1)
      expect(session.selectedAnswer).toBeNull()
      expect(session.isAnswerRevealed).toBe(false)
      expect(session.isActive).toBe(index < sessionLength - 1)
    }
    expect(session.currentQuestion).toBeNull()
    expect(session.correct).toBe(Math.ceil(sessionLength / 2))
    expect(session.incorrect).toBe(Math.floor(sessionLength / 2))
    expect(session.completedAt).toBe(dependencies.now())
    expect(new Set(session.attempts.map((attempt) => attempt.id)).size).toBe(
      sessionLength,
    )
    expect(dependencies.generate).toHaveBeenCalledTimes(sessionLength)
  },
)

test('honors a report that disagrees with arithmetic and stores the entire attempt', () => {
  const dependencies = tools()
  const session = reveal(
    createPracticeSession(configuration, dependencies),
    dependencies,
    6,
  )
  const next = transitionPracticeSession(
    session,
    reportAction(session, true),
    dependencies,
  )
  expect(next).toMatchObject({ attempted: 1, correct: 1, incorrect: 0 })
  expect(next.attempts[0]).toMatchObject({
    sessionId: session.id,
    questionId: session.currentQuestion!.id,
    operation: 'addition',
    firstOperand: 3,
    secondOperand: 4,
    correctAnswer: 7,
    selectedAnswer: 6,
    selfReportedCorrect: true,
    difficulty: 1,
    source: 'regular',
    attemptedAt: dependencies.now(),
  })
})

test('rejects mismatched answers, stale IDs, and repeated reports after advancement', () => {
  const dependencies = tools()
  const session = reveal(
    createPracticeSession(configuration, dependencies),
    dependencies,
  )
  const action = reportAction(session)
  expect(
    transitionPracticeSession(
      session,
      {
        type: 'report',
        sessionId: session.id,
        result: {
          questionId: session.currentQuestion!.id,
          selectedAnswer: 9,
          selfReportedCorrect: true,
        },
      },
      dependencies,
    ),
  ).toBe(session)
  expect(
    transitionPracticeSession(
      session,
      { ...action, sessionId: 'old-session' },
      dependencies,
    ),
  ).toBe(session)
  let next = transitionPracticeSession(session, action, dependencies)
  const advanced = next
  for (let repeat = 0; repeat < 100; repeat++)
    next = transitionPracticeSession(next, action, dependencies)
  expect(next).toBe(advanced)
  expect(next.attempted).toBe(1)
  expect(next.attempts).toHaveLength(1)
  expect(dependencies.generate).toHaveBeenCalledTimes(2)
})

test.each(['addition', 'multiplication'] as const)(
  '%s avoids both identical and reversed facts when another question is available',
  (operation) => {
    const dependencies = tools()
    const make = (id: string, first: number, second: number): Question => {
      const answer = operation === 'addition' ? first + second : first * second
      return createQuestion({
        id,
        operation,
        firstOperand: first,
        secondOperand: second,
        correctAnswer: answer,
        displayText: `${first} ${operation === 'addition' ? '+' : '×'} ${second} = ?`,
        choices: [answer, answer + 1, answer + 2, answer + 3],
      })
    }
    dependencies.generate
      .mockReturnValueOnce(make('first', 3, 4))
      .mockReturnValueOnce(make('same', 3, 4))
      .mockReturnValueOnce(make('reversed', 4, 3))
      .mockReturnValueOnce(make('different', 4, 4))
    const session = reveal(
      createPracticeSession(
        { ...configuration, operations: [operation] },
        dependencies,
      ),
      dependencies,
    )
    const next = transitionPracticeSession(
      session,
      reportAction(session),
      dependencies,
    )
    expect(next.currentQuestion?.id).toBe('different')
    expect(dependencies.generate).toHaveBeenCalledTimes(4)
  },
)

test('repeat avoidance is bounded and a repeated fact still gets a fresh card ID', () => {
  const dependencies = tools()
  dependencies.generate.mockReturnValue(createQuestion())
  const session = reveal(
    createPracticeSession(configuration, dependencies),
    dependencies,
  )
  const next = transitionPracticeSession(
    session,
    reportAction(session),
    dependencies,
  )
  expect(dependencies.generate).toHaveBeenCalledTimes(1 + MAX_REPEAT_ATTEMPTS)
  expect(next.currentQuestion?.id).not.toBe(session.currentQuestion!.id)
  expect(next.currentQuestion?.displayText).toBe(
    session.currentQuestion!.displayText,
  )
  expect(next.isActive).toBe(true)
  expect(next.attempted).toBe(1)
})

test('a failed next question preserves the recorded attempt and retry never counts it again', () => {
  const dependencies = tools()
  const session = reveal(
    createPracticeSession(configuration, dependencies),
    dependencies,
  )
  dependencies.generate.mockImplementationOnce(() => {
    throw new Error('Generation failed')
  })
  const action = reportAction(session)
  const failed = transitionPracticeSession(session, action, dependencies)
  expect(failed).toMatchObject({
    attempted: 1,
    correct: 1,
    currentQuestionIndex: 1,
    currentQuestion: null,
    selectedAnswer: null,
    isAnswerRevealed: false,
    isActive: true,
  })
  expect(failed.questionError).not.toBeNull()
  expect(transitionPracticeSession(failed, action, dependencies)).toBe(failed)
  const recovered = transitionPracticeSession(
    failed,
    { type: 'retry', sessionId: session.id },
    dependencies,
  )
  expect(recovered.currentQuestion).not.toBeNull()
  expect(recovered.questionError).toBeNull()
  expect(recovered.attempted).toBe(1)
  expect(recovered.attempts).toHaveLength(1)
})

test('a failed first question can be retried without restarting the session', () => {
  const dependencies = tools()
  dependencies.generate.mockImplementationOnce(() => {
    throw new Error('Generation failed')
  })
  const failed = createPracticeSession(configuration, dependencies)
  const recovered = transitionPracticeSession(
    failed,
    { type: 'retry', sessionId: failed.id },
    dependencies,
  )
  expect(recovered.id).toBe(failed.id)
  expect(recovered.currentQuestion).not.toBeNull()
  expect(recovered.attempts).toHaveLength(0)
})

test('rejects a malformed or out-of-configuration generated question', () => {
  for (const question of [
    createQuestion({ choices: [] }),
    createQuestion({ difficulty: 2 }),
  ]) {
    const dependencies = tools()
    dependencies.generate.mockReturnValue(question)
    const session = createPracticeSession(configuration, dependencies)
    expect(session.currentQuestion).toBeNull()
    expect(session.questionError).not.toBeNull()
  }
})

test('continuous practice passes 20 attempts and ends without counting an unfinished card', () => {
  const dependencies = tools()
  let session = createPracticeSession(
    { ...configuration, sessionLength: 'continuous' },
    dependencies,
  )
  for (let index = 0; index < 25; index++) {
    session = reveal(session, dependencies)
    session = transitionPracticeSession(
      session,
      reportAction(session),
      dependencies,
    )
    expect(session.isActive).toBe(true)
  }
  const pending = reveal(session, dependencies)
  const ended = transitionPracticeSession(
    pending,
    { type: 'end', sessionId: session.id },
    dependencies,
  )
  expect(ended).toMatchObject({
    attempted: 25,
    correct: 25,
    incorrect: 0,
    isActive: false,
    currentQuestion: null,
    completedAt: dependencies.now(),
  })
  expect(ended.attempts).toHaveLength(25)
  expect(
    transitionPracticeSession(ended, reportAction(pending), dependencies),
  ).toBe(ended)
  expect(dependencies.generate).toHaveBeenCalledTimes(26)
})
