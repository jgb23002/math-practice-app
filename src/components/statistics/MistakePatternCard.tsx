import { useId } from 'react'
import { difficultyOptions, operationOptions } from '../../config/practice'
import type { RankedMistakePattern } from '../../types/statistics'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function MistakePatternCard({
  pattern,
  rank,
  masteryThreshold,
}: RankedMistakePattern & { masteryThreshold: number }) {
  const titleId = useId()
  const difficultyId = useId()
  const option = operationOptions.find(
    (option) => option.value === pattern.operation,
  )!
  const difficulty = difficultyOptions.find(
    (option) => option.value === pattern.difficulty,
  )!.label
  const fact = `${pattern.firstOperand} ${option.symbol} ${pattern.secondOperand} = ${pattern.correctAnswer}`
  const progressValue = pattern.mastered
    ? masteryThreshold
    : Math.min(pattern.similarCorrectCount, masteryThreshold)
  const reviewCountText = `${pattern.similarCorrectCount} correct ${pattern.similarCorrectCount === 1 ? 'review' : 'reviews'}`
  const progressText = pattern.mastered
    ? `Mastered with ${reviewCountText} recorded.`
    : `${reviewCountText} toward a goal of ${masteryThreshold}.`

  return (
    <article
      className={`mistake-pattern${pattern.mastered ? ' mistake-pattern--mastered' : ''}`}
      aria-labelledby={`${titleId} ${difficultyId}`}
    >
      <div className="mistake-pattern__heading">
        <span className="mistake-pattern__rank" aria-label={`Rank ${rank}`}>
          #{rank}
        </span>
        <span
          className={`operation-symbol operation-symbol--${option.color}`}
          aria-hidden="true"
        >
          {option.symbol}
        </span>
        <h4 id={titleId}>{fact}</h4>
        <span className="mistake-pattern__status">
          {pattern.mastered ? 'Mastered' : 'Active'}
        </span>
      </div>
      <p className="mistake-pattern__level" id={difficultyId}>
        {difficulty}
      </p>
      <dl className="mistake-pattern__details">
        <div>
          <dt>Times marked wrong</dt>
          <dd>{pattern.incorrectCount}</dd>
        </div>
        <div>
          <dt>Last missed</dt>
          <dd>
            <time dateTime={pattern.lastIncorrectAt}>
              {dateFormatter.format(new Date(pattern.lastIncorrectAt))}
            </time>
          </dd>
        </div>
      </dl>
      <div className="mistake-pattern__mastery">
        <p>
          <strong>Mastery progress</strong>
          <span>
            {reviewCountText}
            {!pattern.mastered && ` · Goal: ${masteryThreshold}`}
          </span>
        </p>
        <progress
          value={progressValue}
          max={masteryThreshold}
          aria-label={`Mastery progress for ${fact}, ${difficulty}`}
          aria-valuetext={progressText}
        />
        {!pattern.mastered &&
          pattern.similarCorrectCount >= masteryThreshold && (
            <p className="statistics-page__note">
              Your next correct review can finish this goal.
            </p>
          )}
      </div>
    </article>
  )
}

export default MistakePatternCard
