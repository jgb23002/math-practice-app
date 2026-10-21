import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Icon from '../components/common/Icon'
import DifficultySelector from '../components/practice/DifficultySelector'
import OperationSelector from '../components/practice/OperationSelector'
import PracticePlan from '../components/practice/PracticePlan'
import SessionLengthSelector from '../components/practice/SessionLengthSelector'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import type { PracticeSessionLength } from '../types/practiceConfiguration'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { isValidPracticeConfiguration } from '../utils/practiceConfiguration'
import './PracticeSetupPage.css'

function PracticeSetupPage() {
  usePageTitle('Practice setup')
  const { configuration, configureSession, progress } =
    usePracticeConfiguration()
  const location = useLocation()
  const editingSession =
    (location.state as { editSession?: unknown } | null)?.editSession === true
  const settings = progress.settings
  const initial =
    editingSession && configuration
      ? configuration
      : {
          operations: settings.defaultOperations,
          difficulty: settings.defaultDifficulty,
          sessionLength: settings.defaultSessionLength,
        }
  const navigate = useNavigate()
  const [operations, setOperations] = useState<MathOperation[]>(() => [
    ...initial.operations,
  ])
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(
    initial.difficulty,
  )
  const [sessionLength, setSessionLength] = useState<PracticeSessionLength>(
    initial.sessionLength,
  )
  const candidate = { operations, difficulty, sessionLength }
  const isValid = isValidPracticeConfiguration(candidate)
  const validationMessage =
    operations.length === 0
      ? difficulty === null
        ? 'Choose at least one math skill and a difficulty level to start.'
        : 'Choose at least one math skill to start.'
      : difficulty === null
        ? 'Choose a difficulty level to start.'
        : 'Your choices look good. Let’s go!'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValidPracticeConfiguration(candidate)) return
    if (configureSession(candidate)) navigate('/practice/session')
  }

  return (
    <section className="setup-page">
      <div className="setup-heading">
        <p className="eyebrow">
          <Icon name="sparkles" /> Practice setup
        </p>
        <h1 id="page-heading">Your next math adventure</h1>
        <p>
          Pick your skills, find your level, and make a little room to grow.
        </p>
      </div>
      <form
        className="setup-form"
        aria-labelledby="page-heading"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="setup-fields">
          <OperationSelector value={operations} onChange={setOperations} />
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
          <SessionLengthSelector
            value={sessionLength}
            onChange={setSessionLength}
          />
        </div>
        <aside className="setup-summary" aria-labelledby="plan-heading">
          <span className="setup-summary-icon" aria-hidden="true">
            <Icon name="sparkles" />
          </span>
          <h2 id="plan-heading">Your practice plan</h2>
          <p>A few choices. A little adventure. All at your own pace.</p>
          <PracticePlan
            operations={operations}
            difficulty={difficulty}
            sessionLength={sessionLength}
          />
          <button
            type="submit"
            className="button button--primary setup-start"
            disabled={!isValid}
            aria-describedby="setup-validation"
          >
            Start Session <Icon name="arrow" />
          </button>
          <p
            id="setup-validation"
            className="setup-validation"
            role="status"
            aria-atomic="true"
          >
            {validationMessage}
          </p>
        </aside>
      </form>
    </section>
  )
}

export default PracticeSetupPage
