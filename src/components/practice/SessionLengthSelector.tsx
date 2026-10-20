import { sessionLengthOptions } from '../../config/practice'
import type { PracticeSessionLength } from '../../types/practiceConfiguration'

interface SessionLengthSelectorProps {
  value: PracticeSessionLength
  onChange: (value: PracticeSessionLength) => void
}

function SessionLengthSelector({
  value,
  onChange,
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="setup-section" aria-describedby="session-length-help">
      <legend className="selector-legend">
        <span aria-hidden="true">3</span> Choose your practice time
      </legend>
      <p id="session-length-help" className="selector-help">
        A quick visit or a bigger adventure? It&apos;s up to you.
      </p>
      <div className="length-choices">
        {sessionLengthOptions.map(({ value: length, label, description }) => {
          const selected = value === length
          return (
            <label
              className={`choice-card length-choice${selected ? ' is-selected' : ''}`}
              key={length}
            >
              <input
                type="radio"
                name="sessionLength"
                value={length}
                checked={selected}
                onChange={() => onChange(length)}
                aria-labelledby={`length-${length}-label`}
                aria-describedby={`length-${length}-description`}
              />
              <span className="choice-label" id={`length-${length}-label`}>
                {label}
              </span>
              <span
                className="choice-description"
                id={`length-${length}-description`}
              >
                {description}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default SessionLengthSelector
