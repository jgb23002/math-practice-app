import { operationOptions } from '../../config/practice'
import type { MathOperation } from '../../types/question'

interface OperationSelectorProps {
  value: readonly MathOperation[]
  onChange: (value: MathOperation[]) => void
}

function OperationSelector({ value, onChange }: OperationSelectorProps) {
  const allSelected = operationOptions.every((option) =>
    value.includes(option.value),
  )

  function toggleOperation(operation: MathOperation) {
    const selected = new Set(value)
    if (selected.has(operation)) selected.delete(operation)
    else selected.add(operation)
    onChange(
      operationOptions
        .filter((option) => selected.has(option.value))
        .map((option) => option.value),
    )
  }

  return (
    <fieldset className="setup-section" aria-describedby="operations-help">
      <legend className="selector-legend">
        <span aria-hidden="true">1</span> Pick your math skills
      </legend>
      <p id="operations-help" className="selector-help">
        Choose one or more. You can mix things up!
      </p>
      <div className="operation-choices">
        {operationOptions.map(({ value: operation, label, symbol, color }) => {
          const selected = value.includes(operation)
          return (
            <label
              className={`choice-card operation-choice${selected ? ' is-selected' : ''}`}
              key={operation}
            >
              <input
                type="checkbox"
                name="operations"
                value={operation}
                checked={selected}
                onChange={() => toggleOperation(operation)}
              />
              <span
                className={`operation-symbol operation-symbol--${color}`}
                aria-hidden="true"
              >
                {symbol}
              </span>
              <span className="choice-label">{label}</span>
              <span className="choice-status" aria-hidden="true">
                {selected ? 'Selected' : 'Select'}
              </span>
            </label>
          )
        })}
      </div>
      <button
        type="button"
        className="mixed-operations"
        aria-pressed={allSelected}
        onClick={() =>
          onChange(
            allSelected ? [] : operationOptions.map((option) => option.value),
          )
        }
      >
        <span aria-hidden="true" className="mixed-symbols">
          + − × ÷
        </span>
        <span>
          Mixed operations{' '}
          <span className="mixed-help" aria-hidden="true">
            {allSelected
              ? 'All four selected · select again to clear'
              : 'Select all four skills'}
          </span>
        </span>
      </button>
    </fieldset>
  )
}

export default OperationSelector
