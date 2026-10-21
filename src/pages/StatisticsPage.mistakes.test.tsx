import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../app/App'
import { STORAGE_KEYS } from '../config/storage'
import { saveStoredProgress } from '../services/progressPersistence'
import { createJsonStorage } from '../services/storage'
import * as similar from '../services/similarQuestionGenerator'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createMistakeStatisticsProgress } from '../test/mistakeStatisticsFixtures'
import { createAttempt } from '../test/sessionFixtures'
import { emptyProgress } from '../test/storageFixtures'
import type { StoredProgress } from '../types/persistence'
import { calculateStatistics } from '../utils/statistics'

afterEach(() => vi.restoreAllMocks())

function renderStatistics(progress?: StoredProgress) {
  if (progress)
    expect(saveStoredProgress(createJsonStorage(), progress)).toBe(true)
  const view = render(
    <MemoryRouter initialEntries={['/statistics']}>
      <App />
    </MemoryRouter>,
  )
  return { ...view, user: userEvent.setup() }
}
const section = () =>
  screen.getByRole('region', { name: 'Mistakes and mastery' })
function expectTotals(
  active: number,
  mastered: number,
  attempted: number,
  correct: number,
) {
  for (const [label, value] of [
    ['Active mistake patterns', active],
    ['Mastered mistake patterns', mastered],
    ['Similar review questions attempted', attempted],
    ['Correct review answers', correct],
  ] as const)
    expect(
      within(section()).getByText(label, { selector: 'dt' }).nextElementSibling,
    ).toHaveTextContent(String(value))
}

test('displays review totals, all tied operations, and ranked active facts with counts, dates, and progress', () => {
  renderStatistics(createMistakeStatisticsProgress())
  expectTotals(4, 1, 4, 3)
  const frequent = within(section()).getByRole('heading', {
    name: 'Most frequently missed operations',
  }).parentElement!
  expect(frequent).toHaveTextContent(
    'Addition, Multiplication · 8 misses each (tied)',
  )
  const list = screen.getByRole('list', { name: 'Active mistake patterns' })
  const cards = within(list).getAllByRole('article')
  expect(
    cards.map((card) => within(card).getByRole('heading').textContent),
  ).toEqual(['7 − 3 = 4', '3 + 4 = 7', '4 + 3 = 7', '8 ÷ 2 = 4'])
  expect(
    cards.map(
      (card) =>
        within(card).getByText('Times marked wrong').nextElementSibling
          ?.textContent,
    ),
  ).toEqual(['5', '5', '3', '1'])
  expect(cards.map((card) => card.querySelector('time')?.dateTime)).toEqual([
    '2026-10-21T12:01:00.000Z',
    '2026-10-20T12:01:00.000Z',
    '2026-10-21T12:01:00.000Z',
    '2026-10-18T12:01:00.000Z',
  ])
  expect(cards.map((card) => card.querySelector('progress')?.value)).toEqual([
    1, 2, 0, 0,
  ])
  expect(within(list).getAllByLabelText('Rank 1')).toHaveLength(2)
  expect(within(list).getByLabelText('Rank 3')).toBeVisible()
  expect(cards[2]).toHaveAccessibleName('4 + 3 = 7 Level 2: Easy')
  expect(
    screen.queryByRole('list', { name: 'Mastered mistake patterns' }),
  ).not.toBeInTheDocument()
})

test('keyboard filters separate mastered facts without changing stored data or summary totals', async () => {
  const { user } = renderStatistics(createMistakeStatisticsProgress())
  const saved = JSON.stringify(localStorage)
  const mastered = screen.getByRole('button', { name: 'Mastered (1)' })
  const active = screen.getByRole('button', { name: 'Active (4)' })
  expect(active).toHaveTextContent('✓')
  expect(mastered).not.toHaveTextContent('✓')
  mastered.focus()
  await user.keyboard('{Enter}')
  expect(mastered).toHaveAttribute('aria-pressed', 'true')
  expect(mastered).toHaveTextContent('✓')
  expect(active).not.toHaveTextContent('✓')
  expect(screen.getByRole('button', { name: 'Active (4)' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(
    screen.queryByRole('list', { name: 'Active mistake patterns' }),
  ).not.toBeInTheDocument()
  const list = screen.getByRole('list', { name: 'Mastered mistake patterns' })
  const card = within(list).getByRole('article', {
    name: '3 × 4 = 12 Level 1: Beginner',
  })
  expect(within(card).getByText('Mastered')).toBeVisible()
  expect(
    within(card).getByText('Times marked wrong').nextElementSibling,
  ).toHaveTextContent('8')
  expect(within(card).getByRole('progressbar')).toHaveAttribute('value', '3')
  expect(within(card).getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    'Mastered with 3 correct reviews recorded.',
  )
  expectTotals(4, 1, 4, 3)
  screen.getByRole('button', { name: 'Active (4)' }).focus()
  await user.keyboard(' ')
  expect(
    screen.getByRole('list', { name: 'Active mistake patterns' }),
  ).toBeVisible()
  expect(JSON.stringify(localStorage)).toBe(saved)
})

test('no-mistake empty states contain safe zero totals and no fictitious operation winner', async () => {
  const { user } = renderStatistics(emptyProgress())
  expectTotals(0, 0, 0, 0)
  expect(
    screen.getByText(/No saved mistake patterns to compare yet/),
  ).toBeVisible()
  expect(screen.getByText(/No saved mistake patterns yet/)).toBeVisible()
  expect(
    within(section()).queryByRole('link', { name: 'Practice Mistakes' }),
  ).not.toBeInTheDocument()
  expect(within(section()).queryByRole('progressbar')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Mastered (0)' }))
  expect(screen.getByText(/No saved mistake patterns yet/)).toBeVisible()
})

test.each([false, true])(
  'shows a friendly empty view when only mastered=%s patterns exist',
  async (mastered) => {
    const progress = emptyProgress()
    progress.mistakePatterns = [
      createMistakePattern({ mastered, similarCorrectCount: mastered ? 3 : 0 }),
    ]
    const { user } = renderStatistics(progress)
    if (mastered) {
      expect(
        screen.getByRole('heading', { name: 'No active mistakes to review' }),
      ).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Mastered (1)' }))
      expect(
        screen.getByRole('list', { name: 'Mastered mistake patterns' }),
      ).toBeVisible()
    } else {
      await user.click(screen.getByRole('button', { name: 'Mastered (0)' }))
      expect(screen.getByText(/No mastered patterns yet/)).toBeVisible()
    }
  },
)

test('custom thresholds display honest progress while recorded mastery survives threshold changes', async () => {
  const progress = createMistakeStatisticsProgress()
  progress.settings.masteryThreshold = 5
  const { user } = renderStatistics(progress)
  const active = screen.getByRole('article', {
    name: '3 + 4 = 7 Level 1: Beginner',
  })
  const bar = within(active).getByRole('progressbar')
  expect(bar).toHaveAttribute('max', '5')
  expect(bar).toHaveAttribute('value', '2')
  expect(bar).toHaveAttribute(
    'aria-valuetext',
    '2 correct reviews toward a goal of 5.',
  )
  await user.click(screen.getByRole('button', { name: 'Mastered (1)' }))
  const mastered = within(
    screen.getByRole('list', { name: 'Mastered mistake patterns' }),
  ).getByRole('article')
  expect(within(mastered).getByRole('progressbar')).toHaveAttribute(
    'value',
    '5',
  )
  expect(within(mastered).getByText('3 correct reviews')).toBeVisible()
  expect(within(mastered).getByText('Mastered')).toBeVisible()
})

test('active progress above a lowered goal stays bounded and does not silently change mastery', () => {
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern({ similarCorrectCount: 5 })]
  renderStatistics(progress)
  expect(within(section()).getByRole('progressbar')).toHaveAttribute(
    'value',
    '3',
  )
  expect(within(section()).getByRole('progressbar')).toHaveAttribute('max', '3')
  expect(screen.getByText('5 correct reviews · Goal: 3')).toBeVisible()
  expect(screen.getByText(/next correct review can finish/)).toBeVisible()
  expectTotals(1, 0, 0, 0)
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!)[0].mastered,
  ).toBe(false)
})

test('reset clears review attempt totals while preserving pattern statistics and mastery across reloads', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { user, unmount } = renderStatistics(createMistakeStatisticsProgress())
  const saved = localStorage.getItem(STORAGE_KEYS.mistakePatterns)
  await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
  expectTotals(4, 1, 0, 0)
  expect(localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBe(saved)
  expect(
    screen.getByText(/mistake patterns, and mastery progress are unchanged/),
  ).toHaveAttribute('role', 'status')
  unmount()
  renderStatistics()
  expectTotals(4, 1, 0, 0)
  expect(within(section()).getByText('Addition, Multiplication')).toBeVisible()
})

test('review reports update advanced statistics and move newly mastered facts to the separate view exactly once', async () => {
  const progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern({ similarCorrectCount: 2 })]
  progress.attempts = [0, 1].map((index) =>
    createAttempt({
      id: `old-${index}`,
      questionId: `old-${index}`,
      source: 'mistake-review',
      mistakePatternId: 'mistake-one',
    }),
  )
  progress.statistics = calculateStatistics(progress.attempts)
  const { user } = renderStatistics(progress)
  expectTotals(1, 0, 2, 2)
  await user.click(screen.getByRole('link', { name: 'Practice Mistakes' }))
  expect(screen.getByRole('radio', { name: 'Mistake Review' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  const equation = screen.getByRole('heading', {
    name: /\+.*= \?/,
  }).textContent!
  const [first, second] = equation.match(/\d+/g)!.map(Number)
  const wrong = within(screen.getByRole('group', { name: 'Choose one answer' }))
    .getAllByRole('button')
    .find(
      (button) =>
        button.getAttribute('aria-label') !== `Answer ${first + second}`,
    )!
  await user.click(wrong)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const nav = screen.getByRole('navigation', { name: 'Main navigation' })
  await user.click(within(nav).getByRole('link', { name: 'Statistics' }))
  expectTotals(1, 0, 2, 2)
  await user.click(screen.getByRole('link', { name: 'Continue Practice' }))
  const report = screen.getByRole('button', { name: 'I Got It Right' })
  act(() => {
    fireEvent.click(report)
    fireEvent.click(report)
    fireEvent.click(report)
  })
  await user.click(within(nav).getByRole('link', { name: 'Statistics' }))
  expectTotals(0, 1, 3, 3)
  expect(
    screen.getByRole('heading', { name: 'No active mistakes to review' }),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Mastered (1)' }))
  expect(
    within(
      screen.getByRole('list', { name: 'Mastered mistake patterns' }),
    ).getByRole('progressbar'),
  ).toHaveAttribute('value', '3')
})

test('incorrect inverse-review reports increase the original operation and reset its mastery display', async () => {
  const native = similar.generateSimilarQuestion
  vi.spyOn(similar, 'generateSimilarQuestion').mockImplementation(
    (pattern, options) =>
      native(pattern, { ...options, strategy: 'fact-family', random: () => 0 }),
  )
  const progress = emptyProgress()
  progress.mistakePatterns = [
    createMistakePattern({ incorrectCount: 5, similarCorrectCount: 1 }),
  ]
  const { user } = renderStatistics(progress)
  await user.click(screen.getByRole('link', { name: 'Practice Mistakes' }))
  await user.click(screen.getByRole('checkbox', { name: 'Subtraction' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'Answer 4' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
  await user.click(
    within(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).getByRole('link', { name: 'Statistics' }),
  )
  expectTotals(1, 0, 1, 0)
  const frequent = within(section()).getByRole('heading', {
    name: 'Most frequently missed operation',
  }).parentElement!
  expect(frequent).toHaveTextContent('Addition · 6 misses')
  const card = screen.getByRole('article', {
    name: '3 + 4 = 7 Level 1: Beginner',
  })
  expect(
    within(card).getByText('Times marked wrong').nextElementSibling,
  ).toHaveTextContent('6')
  expect(within(card).getByRole('progressbar')).toHaveAttribute('value', '0')
  const attempt = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)[0]
  expect(card.querySelector('time')?.dateTime).toBe(attempt.attemptedAt)
  expect(attempt).toMatchObject({
    operation: 'subtraction',
    selectedAnswer: 4,
    correctAnswer: 4,
    selfReportedCorrect: false,
  })
})
