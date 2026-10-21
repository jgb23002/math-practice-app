import { Navigate } from 'react-router'
import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import SessionTotals from '../components/practice/SessionTotals'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import './SessionSummaryPage.css'

function SessionSummaryPage() {
  usePageTitle('Session summary')
  const { session } = usePracticeConfiguration()
  if (!session) return <Navigate to="/practice/setup" replace />
  if (session.isActive) return <Navigate to="/practice/session" replace />
  return (
    <section className="session-summary">
      <span className="practice-page__star" aria-hidden="true">
        ✦
      </span>
      <p className="eyebrow">Practice complete</p>
      <h1 id="page-heading">A place to celebrate</h1>
      <p>Every try is a step forward. Here’s how you marked your practice!</p>
      <SessionTotals
        attempted={session.attempted}
        correct={session.correct}
        incorrect={session.incorrect}
      />
      <div className="session-summary__actions">
        <ButtonLink to="/practice/setup">
          Choose Your Next Practice <Icon name="arrow" />
        </ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Return Home
        </ButtonLink>
      </div>
    </section>
  )
}

export default SessionSummaryPage
