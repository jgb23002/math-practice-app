import { Navigate, useNavigate } from 'react-router'
import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import SessionTotals from '../components/practice/SessionTotals'
import { difficultyOptions, operationOptions } from '../config/practice'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import { calculateSessionSummary } from '../utils/sessionSummary'
import './SessionSummaryPage.css'

function SessionSummaryPage() {
  usePageTitle('Session summary')
  const { session, restartSession } = usePracticeConfiguration()
  const navigate = useNavigate()
  if (!session) return <Navigate to="/practice/setup" replace />
  if (session.isActive) return <Navigate to="/practice/session" replace />
  const summary = calculateSessionSummary(session)

  function practiceAgain() {
    if (session && restartSession(session.id)) navigate('/practice/session')
  }

  return (
    <section className="session-summary">
      <div className="session-summary__heading">
        <div>
          <span className="practice-page__star" aria-hidden="true">
            ✦
          </span>
          <p className="eyebrow">Practice complete</p>
          <h1 id="page-heading">A place to celebrate</h1>
          <p>
            Every try is a step forward. Here’s how you marked your practice!
          </p>
        </div>
        <div
          className="session-summary__accuracy"
          role="group"
          aria-labelledby="accuracy-label"
        >
          <p id="accuracy-label">Accuracy</p>
          <strong>{summary.accuracy}%</strong>
          <span>
            {summary.attempted === 0
              ? 'No answers marked yet'
              : 'Based on your marks'}
          </span>
        </div>
      </div>
      <SessionTotals
        attempted={summary.attempted}
        correct={summary.correct}
        incorrect={summary.incorrect}
      />
      <dl className="session-summary__details" aria-label="Session details">
        <div>
          <dt>Operations practiced</dt>
          <dd>
            {operationOptions
              .filter((option) => summary.operations.includes(option.value))
              .map((option) => option.label)
              .join(', ') || 'No completed questions'}
          </dd>
        </div>
        <div>
          <dt>Difficulty level</dt>
          <dd>
            {
              difficultyOptions.find(
                (option) => option.value === summary.difficulty,
              )?.label
            }
          </dd>
        </div>
        <div>
          <dt>Mistake-review questions completed</dt>
          <dd>{summary.mistakeReviewCount}</dd>
        </div>
      </dl>
      <div className="session-summary__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={practiceAgain}
        >
          Practice Again <Icon name="arrow" />
        </button>
        <button
          type="button"
          className="button button--secondary session-summary__unavailable"
          disabled
          aria-describedby="mistake-review-note"
        >
          Practice Mistakes
        </button>
        <ButtonLink
          to="/practice/setup"
          variant="secondary"
          aria-describedby="change-settings-note"
        >
          Change Settings
        </ButtonLink>
        <ButtonLink to="/statistics" variant="secondary">
          View Statistics
        </ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Return Home
        </ButtonLink>
      </div>
      <p id="mistake-review-note" className="session-summary__note">
        Practice Mistakes is coming soon. You can try regular practice again!
      </p>
      <p id="change-settings-note" className="session-summary__note">
        Change Settings lets you choose your math skills, level, and practice
        length.
      </p>
    </section>
  )
}

export default SessionSummaryPage
