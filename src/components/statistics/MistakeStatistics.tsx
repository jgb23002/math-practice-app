import { useId, useMemo, useState } from 'react'
import { operationOptions } from '../../config/practice'
import type { MistakePattern } from '../../types/mistake'
import type { PracticeAttempt } from '../../types/session'
import { calculateMistakeStatistics } from '../../utils/mistakeStatistics'
import ButtonLink from '../common/ButtonLink'
import MistakePatternCard from './MistakePatternCard'
import './MistakeStatistics.css'

interface MistakeStatisticsProps {
  patterns: readonly MistakePattern[]
  attempts: readonly PracticeAttempt[]
  masteryThreshold: number
}

function MistakeStatistics({
  patterns,
  attempts,
  masteryThreshold,
}: MistakeStatisticsProps) {
  const headingId = useId()
  const factsHeadingId = useId()
  const panelId = useId()
  const [view, setView] = useState<'active' | 'mastered'>('active')
  const stats = useMemo(
    () => calculateMistakeStatistics(patterns, attempts),
    [patterns, attempts],
  )
  const visible =
    view === 'active' ? stats.activePatterns : stats.masteredPatterns
  const operationNames = operationOptions
    .filter((option) => stats.mostMissedOperations.includes(option.value))
    .map((option) => option.label)
    .join(', ')
  const tied = stats.mostMissedOperations.length > 1

  return (
    <section className="mistake-statistics" aria-labelledby={headingId}>
      <div className="mistake-statistics__heading">
        <div>
          <h2 id={headingId}>Mistakes and mastery</h2>
          <p className="statistics-page__note">
            Tricky facts are a chance to grow. See what you’re practicing and
            what you’ve mastered.
          </p>
        </div>
        {stats.activePatterns.length > 0 && (
          <ButtonLink
            to="/practice/setup"
            state={{ mode: 'mistake-review' }}
            variant="secondary"
          >
            Practice Mistakes
          </ButtonLink>
        )}
      </div>
      <dl className="statistics-metrics mistake-statistics__metrics">
        <div>
          <dt>Active mistake patterns</dt>
          <dd>{stats.activePatterns.length}</dd>
        </div>
        <div>
          <dt>Mastered mistake patterns</dt>
          <dd>{stats.masteredPatterns.length}</dd>
        </div>
        <div>
          <dt>Similar review questions attempted</dt>
          <dd>{stats.reviewAttempted}</dd>
        </div>
        <div>
          <dt>Correct review answers</dt>
          <dd>{stats.reviewCorrect}</dd>
        </div>
      </dl>
      <p className="statistics-page__note">
        Review totals use your recorded “I Got It Right” and “I Got It Wrong”
        marks.
      </p>
      <div className="mistake-statistics__frequent">
        <h3>
          {tied
            ? 'Most frequently missed operations'
            : 'Most frequently missed operation'}
        </h3>
        <p>
          {stats.mostMissedCount === 0 ? (
            'No saved mistake patterns to compare yet.'
          ) : (
            <>
              <strong>{operationNames}</strong> · {stats.mostMissedCount}{' '}
              {stats.mostMissedCount === 1 ? 'miss' : 'misses'}
              {tied && ' each (tied)'}
            </>
          )}
        </p>
        <p className="statistics-page__note">
          Based on saved mistake counts, including mastered patterns. Review
          misses count toward their original pattern’s operation.
        </p>
      </div>
      <section aria-labelledby={factsHeadingId}>
        <h3 id={factsHeadingId}>Frequently missed number facts</h3>
        <p className="statistics-page__note">
          Most often missed first. Within each view, facts with equal counts
          share a rank; the most recent miss comes first among ties.
        </p>
        <div
          className="mistake-statistics__filters"
          role="group"
          aria-label="View mistake patterns"
        >
          {(['active', 'mastered'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="button button--secondary"
              aria-pressed={view === option}
              aria-controls={panelId}
              onClick={() => setView(option)}
            >
              {view === option && <span aria-hidden="true">✓</span>}
              {option === 'active'
                ? `Active (${stats.activePatterns.length})`
                : `Mastered (${stats.masteredPatterns.length})`}
            </button>
          ))}
        </div>
        <p className="mistake-statistics__view-note" aria-live="polite">
          Showing {visible.length} {view} mistake{' '}
          {visible.length === 1 ? 'pattern' : 'patterns'}.
        </p>
        <div id={panelId}>
          {visible.length > 0 ? (
            <ol
              className="mistake-statistics__list"
              aria-label={`${view === 'active' ? 'Active' : 'Mastered'} mistake patterns`}
            >
              {visible.map((item) => (
                <li key={item.pattern.id}>
                  <MistakePatternCard
                    {...item}
                    masteryThreshold={masteryThreshold}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="statistics-page__empty">
              <h4>
                {patterns.length === 0
                  ? 'A fresh start for tricky facts'
                  : view === 'active'
                    ? 'No active mistakes to review'
                    : 'Your mastered facts will grow here'}
              </h4>
              <p>
                {patterns.length === 0
                  ? 'No saved mistake patterns yet. When you mark a question “I Got It Wrong”, its number fact will appear here.'
                  : view === 'active'
                    ? 'You’ve mastered your saved patterns! Choose Mastered to celebrate your progress.'
                    : 'No mastered patterns yet. Correct self-reports in Mistake Review help you work toward mastery.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

export default MistakeStatistics
