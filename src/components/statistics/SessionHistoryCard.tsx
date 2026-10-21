import { useId } from 'react'
import { difficultyOptions, operationOptions } from '../../config/practice'
import type { PracticeSession } from '../../types/session'
import StatisticsMetrics from './StatisticsMetrics'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function SessionHistoryCard({
  session,
  isCurrent,
}: {
  session: PracticeSession
  isCurrent: boolean
}) {
  const headingId = useId()
  return (
    <article className="session-history-card" aria-labelledby={headingId}>
      <div className="session-history-card__heading">
        <h3 id={headingId}>
          <time dateTime={session.startedAt}>
            {dateFormatter.format(new Date(session.startedAt))}
          </time>
        </h3>
        <span className="session-history-card__status">
          {session.completedAt
            ? 'Completed'
            : isCurrent
              ? 'In progress'
              : 'Unfinished'}
        </span>
      </div>
      <dl className="session-history-card__plan">
        <div>
          <dt>Operations</dt>
          <dd>
            {operationOptions
              .filter((option) => session.operations.includes(option.value))
              .map((option) => option.label)
              .join(', ')}
          </dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>
            {
              difficultyOptions.find(
                (option) => option.value === session.difficulty,
              )?.label
            }
          </dd>
        </div>
      </dl>
      <StatisticsMetrics totals={session} />
      {session.attempted === 0 && (
        <p className="statistics-card__empty">
          No answers marked in this session.
        </p>
      )}
    </article>
  )
}

export default SessionHistoryCard
