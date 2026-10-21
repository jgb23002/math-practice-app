import { useEffect, useRef, useState, type Ref } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'
import type { Question } from '../../types/question'
import CardBack from './CardBack'
import CardFront from './CardFront'
import './QuestionCard.css'

export interface QuestionCardResult {
  questionId: string
  selectedAnswer: number
  selfReportedCorrect: boolean
}

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions?: number
  animationsEnabled?: boolean
  onSelfReport: (result: QuestionCardResult) => void
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
}: QuestionCardAttemptProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
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
    if (!isCardFlipped && question.choices.includes(answer))
      setSelectedAnswer(answer)
  }

  function flipCard() {
    if (selectedAnswer !== null && !isCardFlipped) setIsCardFlipped(true)
  }

  function reportResult(correct: boolean) {
    if (!isCardFlipped || selectedAnswer === null || reported.current) return
    // Lock synchronously, including rapid events before the next React render.
    reported.current = true
    setSelfReportedCorrect(correct)
    onSelfReport({
      questionId: question.id,
      selectedAnswer,
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
