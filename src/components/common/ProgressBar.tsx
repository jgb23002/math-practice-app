import './ProgressBar.css'

interface ProgressBarProps {
  current: number
  total: number
}

/** Shows question position, independently of results or session statistics. */
function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div
      className="practice-progress"
      role="progressbar"
      aria-label="Question progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={`Question ${current} of ${total}`}
    >
      <span style={{ width: `${(current / total) * 100}%` }} />
    </div>
  )
}

export default ProgressBar
