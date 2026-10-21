import type {
  SessionRecoverySnapshot,
  StoredProgress,
} from '../types/persistence'
import { sameRecordedAttempt } from '../utils/sessionRecoveryValidation'
import { resumePracticeSession } from './practiceSession'

/** The checkpoint is atomic; completed/newer durable history takes precedence. */
export function resolveSessionRecovery(
  snapshot: SessionRecoverySnapshot,
  durable: StoredProgress,
) {
  const saved = snapshot.session
  if (!saved) return { progress: snapshot.progress, session: null }
  const completed = durable.sessions.find(
    (s) => s.id === saved.id && s.completedAt,
  )
  if (completed) return { progress: durable, session: null }
  const known = durable.attempts.filter((a) => a.sessionId === saved.id)
  const source = saved.mode === 'mistake-review' ? 'mistake-review' : 'regular'
  if (
    known.length > saved.attempted &&
    saved.attempts.every((a) => known.some((b) => sameRecordedAttempt(a, b))) &&
    known.every(
      (a) =>
        a.difficulty === saved.difficulty &&
        saved.operations.includes(a.operation) &&
        a.source === source &&
        (source !== 'mistake-review' || !!a.mistakePatternId),
    ) &&
    (saved.sessionLength === 'continuous' ||
      known.length <= saved.sessionLength)
  ) {
    const last = known.at(-1)
    const previous =
      [saved.currentQuestion, saved.previousQuestion].find(
        (q) => q?.id === last?.questionId,
      ) ?? null
    const session = resumePracticeSession(
      {
        ...saved,
        attempts: known,
        attempted: known.length,
        correct: known.filter((a) => a.selfReportedCorrect).length,
        incorrect: known.filter((a) => !a.selfReportedCorrect).length,
        currentQuestionIndex: known.length,
        previousQuestion: previous,
        currentQuestion: null,
        selectedAnswer: null,
        isAnswerRevealed: false,
      },
      {
        mistakePatterns: durable.mistakePatterns,
        masteryThreshold: durable.settings.masteryThreshold,
      },
    )
    return { progress: durable, session }
  }
  // Divergent records cannot safely be replayed or replaced by an older card.
  if (
    !known.every((a) => saved.attempts.some((b) => sameRecordedAttempt(a, b)))
  )
    return { progress: durable, session: null }
  return { progress: snapshot.progress, session: saved }
}
