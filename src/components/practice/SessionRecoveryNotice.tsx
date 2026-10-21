import { useLocation } from 'react-router'
import usePracticeConfiguration from '../../hooks/usePracticeConfiguration'
import ButtonLink from '../common/ButtonLink'
import './SessionRecoveryNotice.css'

function SessionRecoveryNotice() {
  const { session } = usePracticeConfiguration()
  const { pathname } = useLocation()
  if (
    !session?.isActive ||
    pathname === '/practice/session' ||
    pathname === '/practice/summary'
  )
    return null
  return (
    <aside
      className="session-recovery-notice"
      aria-label="Continue your practice"
    >
      <p>
        Your practice is waiting. You’ve marked {session.attempted}{' '}
        {session.attempted === 1 ? 'answer' : 'answers'}.
      </p>
      <ButtonLink to="/practice/session" variant="secondary">
        Resume Session
      </ButtonLink>
    </aside>
  )
}

export default SessionRecoveryNotice
