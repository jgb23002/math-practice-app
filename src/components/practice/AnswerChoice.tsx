import './QuestionCard.css'

interface AnswerChoiceProps {
  answer: number
  selected: boolean
  disabled?: boolean
  shortcutKey?: number
  onSelect: (answer: number) => void
}

function AnswerChoice({
  answer,
  selected,
  disabled = false,
  shortcutKey,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className={`answer-choice${selected ? ' is-selected' : ''}`}
      aria-label={`Answer ${answer}`}
      aria-pressed={selected}
      aria-keyshortcuts={shortcutKey?.toString()}
      disabled={disabled}
      onClick={() => onSelect(answer)}
    >
      {shortcutKey !== undefined && (
        <kbd className="answer-choice__key" aria-hidden="true">
          {shortcutKey}
        </kbd>
      )}
      <span className="answer-choice__value">{answer}</span>
      <span className="answer-choice__status" aria-hidden="true">
        {selected ? '✓ Selected' : 'Pick me'}
      </span>
    </button>
  )
}

export default AnswerChoice
