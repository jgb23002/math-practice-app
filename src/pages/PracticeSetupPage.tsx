import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Icon from '../components/common/Icon'
import ConfirmationDialog from '../components/common/ConfirmationDialog'
import DifficultySelector from '../components/practice/DifficultySelector'
import OperationSelector from '../components/practice/OperationSelector'
import PracticePlan from '../components/practice/PracticePlan'
import SessionLengthSelector from '../components/practice/SessionLengthSelector'
import PracticeModeSelector from '../components/practice/PracticeModeSelector'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import type {
  PracticeMode,
  PracticeSessionLength,
} from '../types/practiceConfiguration'
import {
  getActiveMistakePatterns,
  getReviewPatterns,
} from '../services/mistakeReview'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { isValidPracticeConfiguration } from '../utils/practiceConfiguration'
import './PracticeSetupPage.css'

function PracticeSetupPage() {
  usePageTitle('Practice setup')
  const {
    configuration,
    configureSession,
    progress,
    getActiveSession,
    dispatchSession,
  } = usePracticeConfiguration()
  const location = useLocation()
  const routeState = location.state as {
    editSession?: unknown
    mode?: unknown
  } | null
  const activePatterns = getActiveMistakePatterns(progress.mistakePatterns)
  const requestedReview =
    routeState?.mode === 'mistake-review' && activePatterns.length > 0
  const editingSession = routeState?.editSession === true
  const settings = progress.settings
  const initial = requestedReview
    ? {
        mode: 'mistake-review' as const,
        difficulty: activePatterns[0].difficulty,
        operations: [
          ...new Set(
            activePatterns
              .filter(
                (pattern) =>
                  pattern.difficulty === activePatterns[0].difficulty,
              )
              .map((pattern) => pattern.operation),
          ),
        ],
        sessionLength: settings.defaultSessionLength,
      }
    : editingSession && configuration
      ? configuration
      : {
          mode: 'regular' as const,
          operations: settings.defaultOperations,
          difficulty: settings.defaultDifficulty,
          sessionLength: settings.defaultSessionLength,
        }
  const navigate = useNavigate()
  const [confirmReplacement, setConfirmReplacement] = useState(false)
  const replacing = useRef(false)
  const [mode, setMode] = useState<PracticeMode>(
    activePatterns.length > 0 && routeState?.mode !== 'regular'
      ? (initial.mode ?? 'regular')
      : 'regular',
  )
  const [operations, setOperations] = useState<MathOperation[]>(() => [
    ...initial.operations,
  ])
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(
    initial.difficulty,
  )
  const [sessionLength, setSessionLength] = useState<PracticeSessionLength>(
    initial.sessionLength,
  )
  const candidate = {
    operations,
    difficulty,
    sessionLength,
    ...(mode === 'mistake-review' ? { mode } : {}),
  }
  const eligibleCount = getReviewPatterns(
    progress.mistakePatterns,
    candidate,
  ).length
  const isValid =
    isValidPracticeConfiguration(candidate) &&
    (mode !== 'mistake-review' || eligibleCount > 0)
  const validationMessage =
    operations.length === 0
      ? difficulty === null
        ? 'Choose at least one math skill and a difficulty level to start.'
        : 'Choose at least one math skill to start.'
      : difficulty === null
        ? 'Choose a difficulty level to start.'
        : mode === 'mistake-review' && eligibleCount === 0
          ? 'No active patterns match these skills and level. Try different choices or Regular Practice.'
          : 'Your choices look good. Let’s go!'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || !isValidPracticeConfiguration(candidate)) return
    if (getActiveSession()) {
      setConfirmReplacement(true)
      return
    }
    if (configureSession(candidate)) navigate('/practice/session')
  }

  return (
    <section className="setup-page">
      {confirmReplacement && (
        <ConfirmationDialog
          title="Start a new practice?"
          description="Your marked answers will stay in your history. Starting a new practice ends the current session. Its unfinished card won’t be counted."
          onCancel={() => setConfirmReplacement(false)}
        >
          <button
            type="button"
            className="button button--primary"
            onClick={() => setConfirmReplacement(false)}
          >
            Keep Current Session
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              if (replacing.current) return
              replacing.current = true
              const active = getActiveSession()
              if (active) dispatchSession({ type: 'end', sessionId: active.id })
              if (configureSession(candidate)) navigate('/practice/session')
              else {
                replacing.current = false
                setConfirmReplacement(false)
              }
            }}
          >
            End and Start New
          </button>
        </ConfirmationDialog>
      )}
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
          <PracticeModeSelector
            value={mode}
            activeCount={activePatterns.length}
            hasPatterns={progress.mistakePatterns.length > 0}
            onChange={setMode}
          />
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
            mode={mode}
            operations={operations}
            difficulty={difficulty}
            sessionLength={sessionLength}
          />
          {mode === 'mistake-review' && (
            <p className="setup-review-count" aria-live="polite">
              {eligibleCount} active{' '}
              {eligibleCount === 1 ? 'pattern matches' : 'patterns match'} your
              choices. Review ends early if you master them all.
            </p>
          )}
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
