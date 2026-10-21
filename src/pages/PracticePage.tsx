import { useState } from 'react'
import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import PracticePlan from '../components/practice/PracticePlan'
import QuestionCard, {
  type QuestionCardResult,
} from '../components/practice/QuestionCard'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import { generateQuestion } from '../services/questionGenerator'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import './PracticePage.css'

function createCard(configuration: PracticeConfiguration) {
  try {
    return generateQuestion(configuration.operations, configuration.difficulty)
  } catch {
    return null
  }
}

function ConfiguredCard({
  configuration,
}: {
  configuration: PracticeConfiguration
}) {
  const [question, setQuestion] = useState(() => createCard(configuration))
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [result, setResult] = useState<QuestionCardResult | null>(null)
  return (
    <div className="practice-page__layout">
      <div className="practice-page__card-area">
        <label className="practice-page__animation-setting">
          <input
            type="checkbox"
            checked={animationsEnabled}
            onChange={(event) => setAnimationsEnabled(event.target.checked)}
          />
          <span>
            Card animation{' '}
            <small>Turn off to switch sides without motion.</small>
          </span>
        </label>
        {question ? (
          <QuestionCard
            question={question}
            questionNumber={1}
            totalQuestions={
              configuration.sessionLength === 'continuous'
                ? undefined
                : configuration.sessionLength
            }
            animationsEnabled={animationsEnabled}
            onSelfReport={setResult}
          />
        ) : (
          <div className="practice-page__recovery">
            <p role="alert">That card got a little tangled. Let’s try again!</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setQuestion(createCard(configuration))}
            >
              Try Again
            </button>
          </div>
        )}
        <p className="practice-page__encouragement">
          <Icon name="heart" />
          {result
            ? 'Thanks for checking your work! Keep being curious.'
            : 'Take your time. Every little try helps you grow.'}
        </p>
      </div>
      <aside
        className="practice-page__plan"
        aria-labelledby="practice-plan-heading"
      >
        <span className="practice-page__star" aria-hidden="true">
          ✦
        </span>
        <h2 id="practice-plan-heading">Your practice plan</h2>
        <PracticePlan
          {...configuration}
          label="Your selected practice configuration"
        />
        <ol className="practice-page__steps">
          <li>Pick your answer.</li>
          <li>Flip and check.</li>
          <li>Tell us how you did.</li>
        </ol>
        <ButtonLink to="/practice/setup" variant="secondary">
          Explore Practice <Icon name="arrow" />
        </ButtonLink>
      </aside>
    </div>
  )
}

function PracticePage() {
  usePageTitle('Practice session')
  const { configuration } = usePracticeConfiguration()
  return (
    <section className="practice-page">
      <div className="practice-page__heading">
        <p className="eyebrow">
          <Icon name="sparkles" /> Practice time
        </p>
        <h1 id="page-heading">Your practice space</h1>
        <p>Pick an answer, flip your card, and see what you discover.</p>
      </div>
      {configuration ? (
        <ConfiguredCard
          key={JSON.stringify(configuration)}
          configuration={configuration}
        />
      ) : (
        <div className="practice-page__empty">
          <span className="practice-page__star" aria-hidden="true">
            ✦
          </span>
          <h2>Let’s find your next challenge</h2>
          <p>
            Choose your math skills and level, then your first card will be
            ready.
          </p>
          <ButtonLink to="/practice/setup">
            Explore Practice <Icon name="arrow" />
          </ButtonLink>
        </div>
      )}
    </section>
  )
}

export default PracticePage
