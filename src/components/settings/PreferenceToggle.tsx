import { useId } from 'react'

interface PreferenceToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: PreferenceToggleProps) {
  const id = useId()
  return (
    <label className="preference-toggle">
      <input
        type="checkbox"
        checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="preference-toggle__copy">
        <span id={`${id}-label`}>{label}</span>
        <small id={`${id}-help`}>{description}</small>
      </span>
      <span className="preference-toggle__state" aria-hidden="true">
        {checked ? 'On' : 'Off'}
      </span>
    </label>
  )
}

export default PreferenceToggle
