import type { PracticeMode } from '../../types/practiceConfiguration'

interface PracticeModeSelectorProps {
  value: PracticeMode
  activeCount: number
  hasPatterns: boolean
  onChange: (mode: PracticeMode) => void
}

function PracticeModeSelector({
  value,
  activeCount,
  hasPatterns,
  onChange,
}: PracticeModeSelectorProps) {
  const availability =
    activeCount > 0
      ? `${activeCount} active mistake ${activeCount === 1 ? 'pattern is' : 'patterns are'} ready to review.`
      : hasPatterns
        ? '0 active mistake patterns. You’ve mastered your saved patterns! Try Regular Practice for a new challenge.'
        : '0 active mistake patterns. Mark a card “I Got It Wrong” in Regular Practice to build your review list.'
  return (
    <fieldset className="setup-section" aria-describedby="review-availability">
      <legend className="selector-legend">Choose your practice</legend>
      <p id="review-availability" className="selector-help" aria-live="polite">
        {availability}
      </p>
      <div className="mode-choices">
        {(
          [
            {
              mode: 'regular',
              label: 'Regular Practice',
              description:
                'Explore new questions with your favorite math skills.',
            },
            {
              mode: 'mistake-review',
              label: 'Mistake Review',
              description:
                'Try related questions and help tricky facts feel easier.',
            },
          ] as const
        ).map(({ mode, label, description }) => (
          <label
            key={mode}
            className={`choice-card mode-choice${value === mode ? ' is-selected' : ''}${mode === 'mistake-review' && activeCount === 0 ? ' is-unavailable' : ''}`}
          >
            <input
              type="radio"
              name="practiceMode"
              value={mode}
              checked={value === mode}
              disabled={mode === 'mistake-review' && activeCount === 0}
              onChange={() => onChange(mode)}
              aria-label={label}
              aria-describedby={`mode-${mode}-description review-availability`}
            />
            <span className="choice-label">{label}</span>
            <span
              id={`mode-${mode}-description`}
              className="choice-description"
            >
              {description}
            </span>
            <span className="choice-status" aria-hidden="true">
              {value === mode
                ? 'Selected'
                : mode === 'mistake-review' && activeCount === 0
                  ? 'No active patterns'
                  : 'Choose this practice'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default PracticeModeSelector
