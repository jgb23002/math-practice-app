import {
  createPracticeSession,
  transitionPracticeSession,
} from '../services/practiceSession'
import { withSessionProgress } from '../services/progressPersistence'
import type { PracticeSessionLength } from '../types/practiceConfiguration'
import type { PracticeSessionState } from '../types/session'
import type { SessionRecoverySnapshot } from '../types/persistence'
import { createQuestion } from './questionFixtures'
import { emptyProgress } from './storageFixtures'

export function recoveryFixture(sessionLength: PracticeSessionLength = 5) {
  let id = 0,
    question = 0
  const dependencies = {
    createId: () => `recovery-id-${++id}`,
    now: () => '2026-10-21T12:00:00.000Z',
    generate: () => {
      const firstOperand = ++question % 2 === 1 ? 0 : 3
      const secondOperand = firstOperand === 0 ? 0 : 4
      const answer = firstOperand + secondOperand
      return createQuestion({
        id: `recovery-question-${question}`,
        firstOperand,
        secondOperand,
        correctAnswer: answer,
        displayText: `${firstOperand} + ${secondOperand} = ?`,
        choices: [answer, answer + 1, answer + 2, answer + 3],
      })
    },
  }
  const session = createPracticeSession(
    { operations: ['addition'], difficulty: 1, sessionLength },
    dependencies,
  )
  return { session, dependencies }
}

export function reportRecoveryAnswer(
  session: PracticeSessionState,
  dependencies: Parameters<typeof transitionPracticeSession>[2],
  correct = false,
) {
  const question = session.currentQuestion!
  const action = {
    sessionId: session.id,
    questionId: question.id,
    answer: question.choices[0],
  }
  const selected = transitionPracticeSession(
    session,
    { ...action, type: 'select' },
    dependencies,
  )
  const revealed = transitionPracticeSession(
    selected,
    { ...action, type: 'reveal' },
    dependencies,
  )
  return transitionPracticeSession(
    revealed,
    {
      type: 'report',
      sessionId: session.id,
      result: {
        questionId: question.id,
        selectedAnswer: action.answer,
        selfReportedCorrect: correct,
      },
    },
    dependencies,
  )
}

export function recoverySnapshot(
  session = recoveryFixture().session,
): SessionRecoverySnapshot {
  return {
    version: 1,
    session,
    progress: withSessionProgress(emptyProgress(), session),
  }
}
