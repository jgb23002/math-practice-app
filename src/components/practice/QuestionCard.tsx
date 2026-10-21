import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'
import type { Question } from '../../types/question'
import type { QuestionResult } from '../../types/session'
import { answerShortcutIndex } from '../../utils/answerShortcut'
import { spokenQuestion } from '../../utils/spokenQuestion'
import CardBack from './CardBack'
import CardFront from './CardFront'
import './QuestionCard.css'

export type QuestionCardResult = QuestionResult

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions?: number
  animationsEnabled?: boolean
  showExplanations?: boolean
  onSelfReport: (result: QuestionCardResult) => void
  onAnswerSelect?: (answer: number) => void
  onReveal?: (answer: number) => void
  initialSelectedAnswer?: number | null
  initiallyRevealed?: boolean
}

interface QuestionCardAttemptProps extends QuestionCardProps {
  frontHeadingRef: Ref<HTMLHeadingElement>
  questionDescriptionId: string
}

function QuestionCardAttempt({
  question,
  questionNumber,
  totalQuestions,
  animationsEnabled = true,
  showExplanations = true,
  onSelfReport,
  frontHeadingRef,
  questionDescriptionId,
  onAnswerSelect,
  onReveal,
  initialSelectedAnswer = null,
  initiallyRevealed = false,
}: QuestionCardAttemptProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(
    initialSelectedAnswer,
  )
  const [isCardFlipped, setIsCardFlipped] = useState(
    initiallyRevealed && initialSelectedAnswer !== null,
  )
  const selectedAnswerRef = useRef(initialSelectedAnswer)
  const flippedRef = useRef(initiallyRevealed && initialSelectedAnswer !== null)
  const [selfReportedCorrect, setSelfReportedCorrect] = useState<
    boolean | null
  >(null)
  const reported = useRef(false)
  const backHeading = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (isCardFlipped) backHeading.current?.focus()
  }, [isCardFlipped])

  function selectAnswer(answer: number) {
    if (!flippedRef.current && question.choices.includes(answer)) {
      selectedAnswerRef.current = answer
      setSelectedAnswer(answer)
      onAnswerSelect?.(answer)
    }
  }

  function flipCard() {
    const answer = selectedAnswerRef.current
    if (answer !== null && !flippedRef.current) {
      flippedRef.current = true
      setIsCardFlipped(true)
      onReveal?.(answer)
    }
  }

  function handleAnswerShortcut(event: KeyboardEvent<HTMLElement>) {
    if (flippedRef.current || reported.current) return
    const index = answerShortcutIndex(event.nativeEvent)
    if (index === null) return
    const answer = question.choices[index]
    if (answer === undefined) return
    event.preventDefault()
    selectAnswer(answer)
    // Expose the newly selected button and its pressed state to screen readers.
    event.currentTarget
      .querySelectorAll<HTMLButtonElement>('.answer-choice')
      [index]?.focus()
  }

  function reportResult(correct: boolean) {
    const answer = selectedAnswerRef.current
    if (!flippedRef.current || answer === null || reported.current) return
    // Lock synchronously, including rapid events before the next React render.
    reported.current = true
    setSelfReportedCorrect(correct)
    onSelfReport({
      questionId: question.id,
      selectedAnswer: answer,
      selfReportedCorrect: correct,
    })
  }

  return (
    <article
      className={`question-card${!animationsEnabled || reducedMotion ? ' question-card--static' : ''}`}
      aria-label={`Question ${questionNumber}`}
      data-flipped={isCardFlipped}
      onKeyDown={handleAnswerShortcut}
    >
      {/* Keep the live region mounted and outside the hidden/inert faces. */}
      <p className="visually-hidden" role="status" aria-atomic="true">
        {isCardFlipped &&
          `${spokenQuestion(question)} Correct answer: ${question.correctAnswer}. Your answer: ${selectedAnswer}. ${
            selfReportedCorrect === null
              ? 'Choose I Got It Right or I Got It Wrong to record your result.'
              : `You marked this as ${selfReportedCorrect ? 'right' : 'wrong'}. Every try helps you learn!`
          }`}
      </p>
      <div className="question-card__turner">
        <div
          className="question-card__face question-card__face--front"
          role="region"
          aria-label="Question front"
          aria-hidden={isCardFlipped}
          inert={isCardFlipped}
        >
          <CardFront
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            active={!isCardFlipped}
            onSelect={selectAnswer}
            onFlip={flipCard}
            headingRef={frontHeadingRef}
            questionDescriptionId={questionDescriptionId}
          />
        </div>
        <div
          className="question-card__face question-card__face--back"
          role="region"
          aria-label="Answer reveal"
          aria-hidden={!isCardFlipped}
          inert={!isCardFlipped}
        >
          <CardBack
            question={question}
            selectedAnswer={selectedAnswer}
            showExplanations={showExplanations}
            active={isCardFlipped}
            selfReportedCorrect={selfReportedCorrect}
            headingRef={backHeading}
            onSelfReport={reportResult}
          />
        </div>
      </div>
    </article>
  )
}

function QuestionCard(props: QuestionCardProps) {
  const questionDescriptionId = useId()
  const frontHeading = useRef<HTMLHeadingElement>(null)
  const previousId = useRef(props.question.id)
  const questionId = props.question.id
  useEffect(() => {
    if (previousId.current !== questionId) frontHeading.current?.focus()
    previousId.current = questionId
  }, [questionId])
  // A new question ID remounts the attempt so no answer, flip, or result leaks
  // into the new card, even when consecutive questions share the same choices.
  return (
    <>
      {/* This region survives the keyed attempt so question changes announce. */}
      <p
        id={questionDescriptionId}
        className="visually-hidden"
        aria-live="polite"
        aria-atomic="true"
      >
        Question {props.questionNumber}
        {props.totalQuestions !== undefined
          ? ` of ${props.totalQuestions}`
          : '. Continuous practice'}
        {`. ${spokenQuestion(props.question)}`}
      </p>
      <QuestionCardAttempt
        key={props.question.id}
        {...props}
        frontHeadingRef={frontHeading}
        questionDescriptionId={questionDescriptionId}
      />
    </>
  )
}

export default QuestionCard
