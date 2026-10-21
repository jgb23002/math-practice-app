import type { OperationStatistics } from '../../types/statistics'
import { formatAccuracy } from '../../utils/statistics'

function StatisticsMetrics({ totals }: { totals: OperationStatistics }) {
  return (
    <dl className="statistics-metrics">
      <div>
        <dt>Attempted</dt>
        <dd>{totals.attempted}</dd>
      </div>
      <div>
        <dt>Correct</dt>
        <dd>{totals.correct}</dd>
      </div>
      <div>
        <dt>Incorrect</dt>
        <dd>{totals.incorrect}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{formatAccuracy(totals)}</dd>
      </div>
    </dl>
  )
}

export default StatisticsMetrics
