import {
  difficultyOptions,
  operationOptions,
  sessionLengthOptions,
} from '../../config/practice'
import type {
  PracticeMode,
  PracticeSessionLength,
} from '../../types/practiceConfiguration'
import type { DifficultyLevel, MathOperation } from '../../types/question'
import './PracticePlan.css'

interface PracticePlanProps {
  mode?: PracticeMode
  operations: readonly MathOperation[]
  difficulty: DifficultyLevel | null
  sessionLength: PracticeSessionLength
  className?: string
  label?: string
}

function PracticePlan({
  mode = 'regular',
  operations,
  difficulty,
  sessionLength,
  className = '',
  label = 'Your practice plan',
}: PracticePlanProps) {
  return (
    <dl className={`practice-plan ${className}`} aria-label={label}>
      <div>
        <dt>Practice mode</dt>
        <dd>
          {mode === 'mistake-review' ? 'Mistake Review' : 'Regular Practice'}
        </dd>
      </div>
      <div>
        <dt>Math skills</dt>
        <dd>
          {operations.length
            ? operationOptions
                .filter((option) => operations.includes(option.value))
                .map((option) => option.label)
                .join(', ')
            : 'No skills picked yet'}
        </dd>
      </div>
      <div>
        <dt>Your level</dt>
        <dd>
          {difficultyOptions.find((option) => option.value === difficulty)
            ?.label ?? 'Pick your level'}
        </dd>
      </div>
      <div>
        <dt>Session length</dt>
        <dd>
          {
            sessionLengthOptions.find(
              (option) => option.value === sessionLength,
            )?.label
          }
        </dd>
      </div>
    </dl>
  )
}

export default PracticePlan
