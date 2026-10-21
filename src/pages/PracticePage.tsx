import { useContext } from 'react'
import { Navigate } from 'react-router'
import SessionExitContext from '../app/SessionExitContext'
import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import PracticePlan from '../components/practice/PracticePlan'
import PracticeFeedback from '../components/practice/PracticeFeedback'
import QuestionCard from '../components/practice/QuestionCard'
import SessionTotals from '../components/practice/SessionTotals'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import './PracticePage.css'
import ErrorMessage from '../components/common/ErrorMessage'
import { QUESTION_ERROR_MESSAGE } from '../services/practiceSession'

function ConfiguredCard({
  configuration,
}: {
  configuration: PracticeConfiguration
}) {
  const { session, dispatchSession, progress, patchSettings } =
    usePracticeConfiguration()
  const animationsEnabled = progress.settings.animationsEnabled
  if (!session) return null
  const question = session.currentQuestion

  function endSession() {
    if (!session) return
    if (
      session.selectedAnswer !== null &&
      !window.confirm('Finish practice? Your current card won’t be counted.')
    )
      return
    dispatchSession({ type: 'end', sessionId: session.id })
  }
  return (
    <div className="practice-page__layout">
      <div className="practice-page__card-area">
        <PracticeFeedback
          attempt={session.attempts.at(-1)}
          enabled={progress.settings.feedbackEnabled !== false}
        />
        {question ? (
          <QuestionCard
            question={question}
            questionNumber={session.currentQuestionIndex + 1}
            totalQuestions={
              configuration.sessionLength === 'continuous'
                ? undefined
                : configuration.sessionLength
            }
            animationsEnabled={animationsEnabled}
            showExplanations={progress.settings.showExplanations}
            initialSelectedAnswer={session.selectedAnswer}
            initiallyRevealed={session.isAnswerRevealed}
            onAnswerSelect={(answer) =>
              dispatchSession({
                type: 'select',
                sessionId: session.id,
                questionId: question.id,
                answer,
              })
            }
            onReveal={(answer) =>
              dispatchSession({
                type: 'reveal',
                sessionId: session.id,
                questionId: question.id,
                answer,
              })
            }
            onSelfReport={(result) =>
              dispatchSession({ type: 'report', sessionId: session.id, result })
            }
          />
        ) : (
          <ErrorMessage
            title="Let’s try another card"
            message={QUESTION_ERROR_MESSAGE}
            onRetry={() =>
              dispatchSession({ type: 'retry', sessionId: session.id })
            }
          />
        )}
        <label className="practice-page__animation-setting">
          <input
            type="checkbox"
            checked={animationsEnabled}
            onChange={(event) =>
              patchSettings({ animationsEnabled: event.target.checked })
            }
          />
          <span>
            Card animation{' '}
            <small>Turn off to switch sides without motion.</small>
          </span>
        </label>
      </div>
      <aside
        className="practice-page__plan"
        aria-labelledby="practice-plan-heading"
      >
        <div className="practice-page__plan-heading">
          <span className="practice-page__star" aria-hidden="true">
            ✦
          </span>
          <h2 id="practice-plan-heading">Your practice plan</h2>
        </div>
        <PracticePlan
          {...configuration}
          label="Your selected practice configuration"
        />
        <SessionTotals
          attempted={session.attempted}
          correct={session.correct}
          incorrect={session.incorrect}
        />
        <ol className="practice-page__steps">
          <li>Pick your answer.</li>
          <li>Flip and check.</li>
          <li>Tell us how you did.</li>
        </ol>
        <div className="practice-page__plan-actions">
          <ButtonLink
            to="/practice/setup"
            state={{ editSession: true }}
            variant="secondary"
          >
            Explore Practice <Icon name="arrow" />
          </ButtonLink>
          {session.sessionLength === 'continuous' && (
            <button
              type="button"
              className="button button--secondary practice-page__end"
              onClick={endSession}
            >
              End Session
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

function PracticePage() {
  usePageTitle('Practice session')
  const leaving = useContext(SessionExitContext)
  const { configuration, session } = usePracticeConfiguration()
  if (!configuration || !session)
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={{ notice: 'missing-session' }}
      />
    )
  if (!session.isActive)
    return leaving ? null : <Navigate to="/practice/summary" replace />
  return (
    <section className="practice-page">
      <div className="practice-page__heading">
        <p className="eyebrow">
          <Icon name="sparkles" /> Practice time
        </p>
        <h1 id="page-heading">Your practice space</h1>
        <p>Pick an answer, flip your card, and see what you discover.</p>
        {session.mode === 'mistake-review' && (
          <p className="selector-help">
            Mistake Review: these questions connect to your saved tricky facts.
            Your marks help them become mastered!
          </p>
        )}
      </div>
      <ConfiguredCard key={session.id} configuration={configuration} />
    </section>
  )
}

export default PracticePage
