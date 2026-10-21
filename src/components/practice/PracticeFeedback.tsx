import { useState } from 'react'
import type { PracticeAttempt } from '../../types/session'
import { practiceFeedback } from '../../utils/practiceFeedback'
import Icon from '../common/Icon'
import './PracticeFeedback.css'

interface PracticeFeedbackProps {
  attempt?: Pick<PracticeAttempt, 'id' | 'selfReportedCorrect'>
  enabled: boolean
}

function FeedbackMessage({ correct }: { correct: boolean | null }) {
  // The keyed child chooses once per recorded attempt, never on answer changes,
  // card flips, viewport changes, or unrelated preference updates.
  const [message] = useState(() => practiceFeedback(correct))
  return message
}

function PracticeFeedback({ attempt, enabled }: PracticeFeedbackProps) {
  if (!enabled) return null
  return (
    <p
      className={`practice-feedback${attempt?.selfReportedCorrect === false ? ' practice-feedback--supportive' : ''}`}
      role="status"
      aria-label="Practice encouragement"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon
        name={attempt?.selfReportedCorrect === false ? 'heart' : 'sparkles'}
      />
      <span>
        <FeedbackMessage
          key={attempt?.id ?? 'welcome'}
          correct={attempt?.selfReportedCorrect ?? null}
        />
      </span>
    </p>
  )
}

export default PracticeFeedback
