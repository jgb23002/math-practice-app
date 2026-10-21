import { useState } from 'react'
import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import StatisticsCard from '../components/statistics/StatisticsCard'
import StatisticsMetrics from '../components/statistics/StatisticsMetrics'
import SessionHistoryCard from '../components/statistics/SessionHistoryCard'
import { difficultyOptions, operationOptions } from '../config/practice'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import { getRecentSessions } from '../utils/statistics'
import './StatisticsPage.css'

const RESET_STATISTICS_CONFIRMATION =
  'Are you sure you want to erase all practice history and statistics?'

function StatisticsPage() {
  usePageTitle('Statistics')
  const { progress, session, resetStatistics } = usePracticeConfiguration()
  const [resetOutcome, setResetOutcome] = useState<'saved' | 'unsaved' | null>(
    null,
  )
  const { statistics } = progress
  const recentSessions = getRecentSessions(progress.sessions)
  const hasHistory =
    statistics.attempted > 0 ||
    progress.attempts.length > 0 ||
    recentSessions.length > 0

  function confirmReset() {
    if (!window.confirm(RESET_STATISTICS_CONFIRMATION)) return
    setResetOutcome(resetStatistics() ? 'saved' : 'unsaved')
  }

  return (
    <div className="statistics-page">
      <div className="statistics-page__heading">
        <div>
          <p className="eyebrow">
            <Icon name="chart" /> Your practice story
          </p>
          <h1 id="page-heading">See how you grow</h1>
          <p>
            Every try adds to your story. Here’s how you’ve marked your
            practice.
          </p>
        </div>
        <ButtonLink
          to={session?.isActive ? '/practice/session' : '/practice/setup'}
        >
          {session?.isActive ? 'Continue Practice' : 'Start Practice'}{' '}
          <Icon name="arrow" />
        </ButtonLink>
      </div>

      <section
        className="statistics-overview"
        aria-labelledby="statistics-overview-heading"
      >
        <h2 id="statistics-overview-heading">All your practice</h2>
        <StatisticsMetrics totals={statistics} />
        {statistics.attempted === 0 && (
          <div className="statistics-page__empty">
            <h3>Your story starts with one try</h3>
            <p>
              No answers marked yet. Choose some math skills and give them a go!
            </p>
            <ButtonLink to="/practice/setup" variant="secondary">
              Choose Your Practice
            </ButtonLink>
          </div>
        )}
        <p className="statistics-page__note">
          Accuracy uses your “I Got It Right” marks. Percentages are rounded to
          the nearest whole number.
        </p>
      </section>

      <section aria-labelledby="statistics-operations-heading">
        <h2 id="statistics-operations-heading">By operation</h2>
        <div className="statistics-page__grid">
          {operationOptions.map((option) => (
            <StatisticsCard
              key={option.value}
              title={option.label}
              totals={statistics.byOperation[option.value]}
              symbol={
                <span
                  className={`operation-symbol operation-symbol--${option.color}`}
                  aria-hidden="true"
                >
                  {option.symbol}
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="statistics-difficulty-heading">
        <h2 id="statistics-difficulty-heading">By difficulty</h2>
        <div className="statistics-page__grid">
          {difficultyOptions.map((option) => (
            <StatisticsCard
              key={option.value}
              title={option.label}
              totals={statistics.byDifficulty[option.value]}
              symbol={
                <span className="statistics-card__level" aria-hidden="true">
                  {option.value}
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="statistics-recent-heading">
        <h2 id="statistics-recent-heading">Recent sessions</h2>
        <p className="statistics-page__note">
          Your latest practice sessions, newest first.
        </p>
        {recentSessions.length === 0 ? (
          <p className="statistics-page__empty">
            No sessions yet. Your practice sessions will appear here.
          </p>
        ) : (
          <ol className="session-history" aria-label="Recent sessions">
            {recentSessions.map((item) => (
              <li key={item.id}>
                <SessionHistoryCard
                  session={item}
                  isCurrent={session?.id === item.id && session.isActive}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="statistics-reset"
        aria-labelledby="statistics-reset-heading"
      >
        <div>
          <h2 id="statistics-reset-heading">Manage your practice history</h2>
          <p id="statistics-reset-explanation">
            Reset clears practice history and ends any current session. Your
            settings will stay.
          </p>
        </div>
        <button
          type="button"
          className="button button--secondary statistics-reset__button"
          aria-describedby="statistics-reset-explanation"
          onClick={confirmReset}
          disabled={!hasHistory && resetOutcome !== 'unsaved'}
        >
          Reset Statistics
        </button>
        <p
          className="statistics-reset__notice"
          role="status"
          aria-live="polite"
        >
          {resetOutcome === 'saved'
            ? 'Your practice history and statistics have been reset. Your settings are unchanged.'
            : resetOutcome === 'unsaved'
              ? 'Your statistics are cleared for now, but the reset couldn’t be saved. Saved history may return after a reload. You can try Reset Statistics again.'
              : ''}
        </p>
      </section>
    </div>
  )
}

export default StatisticsPage
