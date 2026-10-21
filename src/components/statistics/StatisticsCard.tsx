import { useId, type ReactNode } from 'react'
import type { OperationStatistics } from '../../types/statistics'
import StatisticsMetrics from './StatisticsMetrics'

function StatisticsCard({
  title,
  symbol,
  totals,
}: {
  title: string
  symbol: ReactNode
  totals: OperationStatistics
}) {
  const headingId = useId()
  return (
    <article className="statistics-card" aria-labelledby={headingId}>
      <div className="statistics-card__heading">
        {symbol}
        <h3 id={headingId}>{title}</h3>
      </div>
      <StatisticsMetrics totals={totals} />
      {totals.attempted === 0 && (
        <p className="statistics-card__empty">No attempts yet</p>
      )}
    </article>
  )
}

export default StatisticsCard
