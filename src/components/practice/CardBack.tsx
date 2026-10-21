import type { Ref } from 'react'
import type { Question } from '../../types/question'
import './QuestionCard.css'

interface CardBackProps {
  question: Question
  selectedAnswer: number | null
  active: boolean
  showExplanations?: boolean
  selfReportedCorrect: boolean | null
  headingRef?: Ref<HTMLHeadingElement>
  onSelfReport: (correct: boolean) => void
}

function explain(question: Question) {
  const {
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = question
  switch (question.operation) {
    case 'addition':
      return `Put ${first} and ${second} together. They make ${answer}.`
    case 'subtraction':
      return `Start with ${first} and take away ${second}. You have ${answer} left.`
    case 'multiplication':
      return `Think of ${first} ${first === 1 ? 'group' : 'groups'} of ${second}. Altogether, that makes ${answer}.`
    case 'division':
      return `Share ${first} equally into ${second} ${second === 1 ? 'group' : 'groups'}. There ${answer === 1 ? 'is' : 'are'} ${answer} in each group.`
  }
}

function CardBack({
  question,
  selectedAnswer,
  active,
  showExplanations = true,
  selfReportedCorrect,
  headingRef,
  onSelfReport,
}: CardBackProps) {
  const reported = selfReportedCorrect !== null
  return (
    <>
      <span className="question-card__badge question-card__badge--back">
        <span aria-hidden="true">✦ </span>A little discovery
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="question-card__back-heading"
      >
        Let’s check it out!
      </h2>
      <p className="question-card__equation question-card__equation--back">
        {question.displayText}
      </p>
      <dl className="question-card__answers">
        <div>
          <dt>Correct answer</dt>
          <dd>{question.correctAnswer}</dd>
        </div>
        <div>
          <dt>Your answer</dt>
          <dd>{selectedAnswer ?? 'Not selected'}</dd>
        </div>
      </dl>
      {showExplanations && (
        <div className="question-card__explanation">
          <h3>Let’s think it through</h3>
          <p>{explain(question)}</p>
        </div>
      )}
      <p className="question-card__reflection">
        How did that one go? You decide.
      </p>
      <div
        className="question-card__report-actions"
        role="group"
        aria-label="Mark your result"
      >
        <button
          type="button"
          className="button question-card__report question-card__report--right"
          disabled={!active || reported}
          aria-pressed={selfReportedCorrect === true}
          onClick={() => onSelfReport(true)}
        >
          I Got It Right
        </button>
        <button
          type="button"
          className="button question-card__report question-card__report--wrong"
          disabled={!active || reported}
          aria-pressed={selfReportedCorrect === false}
          onClick={() => onSelfReport(false)}
        >
          I Got It Wrong
        </button>
      </div>
      <p className="question-card__result">
        {reported
          ? `You marked this as ${selfReportedCorrect ? 'right' : 'wrong'}. Every try helps you learn!`
          : 'Take a moment to check, then choose how you did.'}
      </p>
    </>
  )
}

export default CardBack
