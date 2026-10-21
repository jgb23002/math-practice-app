import { useEffect, useRef, useState, type Ref } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'
import type { Question } from '../../types/question'
import type { QuestionResult } from '../../types/session'
import CardBack from './CardBack'
import CardFront from './CardFront'
import './QuestionCard.css'

export type QuestionCardResult = QuestionResult

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions?: number
  animationsEnabled?: boolean
  onSelfReport: (result: QuestionCardResult) => void
  onAnswerSelect?: (answer: number) => void
  onReveal?: (answer: number) => void
  initialSelectedAnswer?: number | null
  initiallyRevealed?: boolean
}

interface QuestionCardAttemptProps extends QuestionCardProps {
  frontHeadingRef: Ref<HTMLHeadingElement>
}

function QuestionCardAttempt({
  question,
  questionNumber,
  totalQuestions,
  animationsEnabled = true,
  onSelfReport,
  frontHeadingRef,
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
    >
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
    <QuestionCardAttempt
      key={props.question.id}
      {...props}
      frontHeadingRef={frontHeading}
    />
  )
}

export default QuestionCard
