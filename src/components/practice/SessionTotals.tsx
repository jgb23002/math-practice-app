import './SessionTotals.css'

interface SessionTotalsProps {
  attempted: number
  correct: number
  incorrect: number
}

function SessionTotals({ attempted, correct, incorrect }: SessionTotalsProps) {
  return (
    <dl
      className="session-totals"
      aria-label="Session totals"
      aria-live="polite"
      aria-atomic="true"
    >
      <div>
        <dt>Attempted</dt>
        <dd>{attempted}</dd>
      </div>
      <div>
        <dt>Correct</dt>
        <dd>{correct}</dd>
      </div>
      <div>
        <dt>Incorrect</dt>
        <dd>{incorrect}</dd>
      </div>
    </dl>
  )
}

export default SessionTotals
