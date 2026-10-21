import './QuestionCard.css'

interface AnswerChoiceProps {
  answer: number
  selected: boolean
  disabled?: boolean
  onSelect: (answer: number) => void
}

function AnswerChoice({
  answer,
  selected,
  disabled = false,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className={`answer-choice${selected ? ' is-selected' : ''}`}
      aria-label={`Answer ${answer}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(answer)}
    >
      <span className="answer-choice__value">{answer}</span>
      <span className="answer-choice__status" aria-hidden="true">
        {selected ? '✓ Selected' : 'Pick me'}
      </span>
    </button>
  )
}

export default AnswerChoice
