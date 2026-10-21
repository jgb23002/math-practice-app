import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { largeHistoryFixture } from '../../test/largeHistoryFixture'
import { createMistakePattern } from '../../test/mistakeFixtures'
import * as statistics from '../../utils/mistakeStatistics'
import MistakeStatistics from './MistakeStatistics'

afterEach(() => vi.restoreAllMocks())

test('5,000-attempt aggregates are reused for filters and threshold-only changes and refreshed when records change', async () => {
  const calculate = vi.spyOn(statistics, 'calculateMistakeStatistics')
  const patterns = [createMistakePattern()]
  const attempts = largeHistoryFixture().attempts
  const view = render(
    <MemoryRouter>
      <MistakeStatistics
        patterns={patterns}
        attempts={attempts}
        masteryThreshold={3}
      />
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  expect(calculate).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Mastered (0)' }))
  await user.click(screen.getByRole('button', { name: 'Active (1)' }))
  view.rerender(
    <MemoryRouter>
      <MistakeStatistics
        patterns={patterns}
        attempts={attempts}
        masteryThreshold={5}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('progressbar')).toHaveAttribute('max', '5')
  expect(calculate).toHaveBeenCalledTimes(1)
  const reviews = [
    ...attempts,
    {
      ...attempts[0],
      id: 'new-review',
      questionId: 'new-question',
      source: 'mistake-review' as const,
      selfReportedCorrect: true,
      mistakePatternId: patterns[0].id,
    },
  ]
  view.rerender(
    <MemoryRouter>
      <MistakeStatistics
        patterns={patterns}
        attempts={reviews}
        masteryThreshold={5}
      />
    </MemoryRouter>,
  )
  expect(calculate).toHaveBeenCalledTimes(2)
  expect(
    screen.getByText('Similar review questions attempted').nextElementSibling,
  ).toHaveTextContent('1')
  expect(
    screen.getByText('Correct review answers').nextElementSibling,
  ).toHaveTextContent('1')
  view.rerender(
    <MemoryRouter>
      <MistakeStatistics
        patterns={[{ ...patterns[0], mastered: true, similarCorrectCount: 5 }]}
        attempts={reviews}
        masteryThreshold={5}
      />
    </MemoryRouter>,
  )
  expect(calculate).toHaveBeenCalledTimes(3)
  expect(screen.getByRole('button', { name: 'Mastered (1)' })).toBeVisible()
})
