import { difficultyOptions } from '../../config/practice'
import type { DifficultyLevel } from '../../types/question'

interface DifficultySelectorProps {
  value: DifficultyLevel | null
  onChange: (value: DifficultyLevel) => void
}

function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <fieldset className="setup-section" aria-describedby="difficulty-help">
      <legend className="selector-legend">
        <span aria-hidden="true">2</span> Find your level
      </legend>
      <p id="difficulty-help" className="selector-help">
        Pick one that feels right. You can always try another.
      </p>
      <div className="difficulty-choices">
        {difficultyOptions.map(({ value: level, label, description }) => {
          const selected = value === level
          return (
            <label
              className={`choice-card difficulty-choice${selected ? ' is-selected' : ''}`}
              key={level}
            >
              <input
                type="radio"
                name="difficulty"
                value={level}
                checked={selected}
                onChange={() => onChange(level)}
                aria-labelledby={`level-${level}-label`}
                aria-describedby={`level-${level}-description`}
              />
              <span className="choice-label" id={`level-${level}-label`}>
                {label}
              </span>
              <span
                className="choice-description"
                id={`level-${level}-description`}
              >
                {description}
              </span>
              <span className="choice-status" aria-hidden="true">
                {selected ? 'Selected' : 'Choose this level'}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default DifficultySelector
