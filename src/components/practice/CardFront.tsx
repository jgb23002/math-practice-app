import { useId, type Ref } from 'react'
import type { Question } from '../../types/question'
import ProgressBar from '../common/ProgressBar'
import AnswerChoice from './AnswerChoice'
import './QuestionCard.css'

interface CardFrontProps {
  question: Question
  questionNumber: number
  totalQuestions?: number
  selectedAnswer: number | null
  active: boolean
  onSelect: (answer: number) => void
  onFlip: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

function CardFront({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  active,
  onSelect,
  onFlip,
  headingRef,
}: CardFrontProps) {
  const helpId = useId()
  return (
    <>
      <div className="question-card__topline">
        <p className="question-card__position">
          Question {questionNumber}
          {totalQuestions !== undefined && ` of ${totalQuestions}`}
        </p>
        <span className="question-card__badge">
          <span aria-hidden="true">✦ </span>Your turn
        </span>
      </div>
      {totalQuestions !== undefined && (
        <ProgressBar current={questionNumber} total={totalQuestions} />
      )}
      <p className="question-card__prompt">What do you think the answer is?</p>
      <h2 ref={headingRef} tabIndex={-1} className="question-card__equation">
        {question.displayText}
      </h2>
      <div
        className="answer-choices"
        role="group"
        aria-label="Choose one answer"
        aria-describedby={helpId}
      >
        {question.choices.map((answer) => (
          <AnswerChoice
            key={answer}
            answer={answer}
            selected={selectedAnswer === answer}
            disabled={!active}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p id={helpId} className="question-card__hint">
        {selectedAnswer === null
          ? 'Pick an answer to unlock your card.'
          : 'You can change your answer before you flip.'}
      </p>
      <button
        type="button"
        className="button button--primary question-card__flip"
        disabled={!active || selectedAnswer === null}
        onClick={onFlip}
      >
        Flip Card <span aria-hidden="true">↻</span>
      </button>
    </>
  )
}

export default CardFront
