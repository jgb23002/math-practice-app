import TestRouter from '../test/TestRouter'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../app/App'
import { STORAGE_KEYS } from '../config/storage'
import { saveStoredProgress } from '../services/progressPersistence'
import { createJsonStorage } from '../services/storage'
import * as questionGenerator from '../services/questionGenerator'
import { createCompletedSession } from '../test/sessionFixtures'
import { createQuestion } from '../test/questionFixtures'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createStatisticsProgress } from '../test/statisticsFixtures'
import { emptyProgress } from '../test/storageFixtures'
import type { StoredProgress } from '../types/persistence'

afterEach(() => vi.restoreAllMocks())

function renderStatistics(
  progress: StoredProgress = createStatisticsProgress(),
) {
  expect(saveStoredProgress(createJsonStorage(), progress)).toBe(true)
  const view = render(
    <TestRouter initialEntries={['/statistics']}>
      <App />
    </TestRouter>,
  )
  return { user: userEvent.setup(), ...view }
}

function expectMetrics(
  root: HTMLElement,
  attempted: number,
  correct: number,
  incorrect: number,
  accuracy: string,
) {
  for (const [label, value] of [
    ['Attempted', attempted],
    ['Correct', correct],
    ['Incorrect', incorrect],
    ['Accuracy', accuracy],
  ] as const) {
    const term = within(root).getByText(label, { selector: 'dt' })
    expect(term.nextElementSibling?.textContent).toBe(String(value))
  }
}

test('shows a welcoming empty overview, all eight empty groups, and empty recent history', async () => {
  const { user } = renderStatistics(emptyProgress())
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
    '0%',
  )
  expect(
    screen.getByRole('heading', { name: 'Your story starts with one try' }),
  ).toBeVisible()
  for (const label of [
    'Addition',
    'Subtraction',
    'Multiplication',
    'Division',
    'Level 1: Beginner',
    'Level 2: Easy',
    'Level 3: Intermediate',
    'Level 4: Advanced',
  ]) {
    const card = screen.getByRole('article', { name: label })
    expectMetrics(card, 0, 0, 0, '0%')
    expect(within(card).getByText('No attempts yet')).toBeVisible()
  }
  expect(
    screen.getByText(
      'No sessions yet. Your practice sessions will appear here.',
    ),
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Reset Statistics' }),
  ).toBeDisabled()
  expect(document.title).toBe('Statistics | Math Practice')
  await user.click(screen.getByRole('link', { name: 'Choose Your Practice' }))
  expect(
    screen.getByRole('heading', { name: 'Your next math adventure' }),
  ).toBeVisible()
})

test('shows overall counts and every operation and difficulty with independent accuracy', () => {
  renderStatistics()
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    8,
    5,
    3,
    '63%',
  )
  for (const [label, correct, incorrect, accuracy] of [
    ['Addition', 1, 1, '50%'],
    ['Subtraction', 1, 1, '50%'],
    ['Multiplication', 2, 0, '100%'],
    ['Division', 1, 1, '50%'],
    ['Level 1: Beginner', 1, 1, '50%'],
    ['Level 2: Easy', 1, 1, '50%'],
    ['Level 3: Intermediate', 1, 1, '50%'],
    ['Level 4: Advanced', 2, 0, '100%'],
  ] as const)
    expectMetrics(
      screen.getByRole('article', { name: label }),
      2,
      correct,
      incorrect,
      accuracy,
    )
  expect(screen.queryByText('No attempts yet')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Start Practice' })).toHaveAttribute(
    'href',
    '/practice/setup',
  )
})

test('shows recent sessions newest first with dates, operation names, difficulty, totals, and accuracy', () => {
  renderStatistics()
  const list = screen.getByRole('list', { name: 'Recent sessions' })
  const rows = within(list).getAllByRole('article')
  expect(rows.map((row) => row.querySelector('time')?.dateTime)).toEqual([
    '2026-10-20T12:00:00.000Z',
    '2026-10-19T12:00:00.000Z',
    '2026-10-18T12:00:00.000Z',
    '2026-10-17T12:00:00.000Z',
  ])
  expect(rows[0].querySelector('time')?.textContent).toMatch(/2026/)
  expect(rows[0]).toHaveTextContent('Subtraction, Division')
  expect(rows[0]).toHaveTextContent('Level 4: Advanced')
  expect(rows[0]).toHaveTextContent('Unfinished')
  expectMetrics(rows[0], 2, 2, 0, '100%')
  for (const row of rows.slice(1)) {
    expectMetrics(row, 2, 1, 1, '50%')
    expect(within(row).getByText('Completed')).toBeVisible()
  }
})

test('preserves aggregate history even if attempt details are unavailable', () => {
  const progress = createStatisticsProgress()
  progress.attempts = []
  progress.sessions = []
  renderStatistics(progress)
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    8,
    5,
    3,
    '63%',
  )
  expect(
    screen.queryByText('No answers marked yet.', { exact: false }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reset Statistics' })).toBeEnabled()
})

test('handles a completed continuous session with no recorded answers', () => {
  const progress = emptyProgress()
  progress.sessions = [
    createCompletedSession([], { sessionLength: 'continuous' }),
  ]
  renderStatistics(progress)
  const row = within(
    screen.getByRole('list', { name: 'Recent sessions' }),
  ).getByRole('article')
  expectMetrics(row, 0, 0, 0, '0%')
  expect(within(row).getByText('Completed')).toBeVisible()
  expect(
    within(row).getByText('No answers marked in this session.'),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Reset Statistics' })).toBeEnabled()
})

test('cancelling the explicit reset confirmation leaves data and the page unchanged', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const { user } = renderStatistics()
  const before = JSON.stringify(localStorage)
  await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
  expect(confirm).toHaveBeenCalledExactlyOnceWith(
    'Are you sure you want to erase all practice history and statistics?',
  )
  expect(JSON.stringify(localStorage)).toBe(before)
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    8,
    5,
    3,
    '63%',
  )
  expect(screen.queryByText(/have been reset/)).not.toBeInTheDocument()
})

test('keyboard-confirmed reset clears history persistently while preserving every preference and unrelated key', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const progress = createStatisticsProgress()
  progress.mistakePatterns = [createMistakePattern()]
  const { user, unmount } = renderStatistics(progress)
  localStorage.setItem('other.preference', 'stay')
  const patterns = localStorage.getItem(STORAGE_KEYS.mistakePatterns)
  const settings = localStorage.getItem(STORAGE_KEYS.settings)
  const version = localStorage.getItem(STORAGE_KEYS.version)
  screen.getByRole('button', { name: 'Reset Statistics' }).focus()
  await user.keyboard('{Enter}')
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
    '0%',
  )
  expect(
    screen.getByRole('button', { name: 'Reset Statistics' }),
  ).toBeDisabled()
  expect(screen.getByText(/have been reset/)).toHaveAttribute('role', 'status')
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)).toEqual([])
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  const statistics = JSON.parse(localStorage.getItem(STORAGE_KEYS.statistics)!)
  expect(statistics.attempted).toBe(0)
  for (const group of [
    ...Object.values(statistics.byOperation),
    ...Object.values(statistics.byDifficulty),
  ])
    expect(group).toEqual({ attempted: 0, correct: 0, incorrect: 0 })
  expect(localStorage.getItem(STORAGE_KEYS.settings)).toBe(settings)
  expect(localStorage.getItem(STORAGE_KEYS.version)).toBe(version)
  expect(localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBe(patterns)
  expect(localStorage.getItem('other.preference')).toBe('stay')
  unmount()
  render(
    <TestRouter initialEntries={['/statistics']}>
      <App />
    </TestRouter>,
  )
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
    '0%',
  )
  expect(
    screen.getByText(
      'No sessions yet. Your practice sessions will appear here.',
    ),
  ).toBeVisible()
  expect(localStorage.getItem(STORAGE_KEYS.settings)).toBe(settings)
})

test('a failed reset stays usable, explains that saved history may return, and supports retry', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { user } = renderStatistics()
  const originalAttempts = localStorage.getItem(STORAGE_KEYS.attempts)
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
    '0%',
  )
  expect(
    screen.getByText(/Saved history may return after a reload/),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Reset Statistics' })).toBeEnabled()
  expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe(originalAttempts)
  fail.mockRestore()
  await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  expect(screen.getByText(/have been reset/)).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Reset Statistics' }),
  ).toBeDisabled()
})

test('statistics update only after self-reporting and show the current session without completing it', async () => {
  let count = 0
  vi.spyOn(questionGenerator, 'generateQuestion').mockImplementation(() => {
    const first = ++count % 2 === 1 ? 3 : 4
    return createQuestion({
      id: `question-${count}`,
      firstOperand: first,
      correctAnswer: first + 4,
      displayText: `${first} + 4 = ?`,
      choices: [6, 7, 8, 9],
    })
  })
  const user = userEvent.setup()
  render(
    <TestRouter initialEntries={['/practice/setup']}>
      <App />
    </TestRouter>,
  )
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const nav = screen.getByRole('navigation', { name: 'Main navigation' })
  await user.click(within(nav).getByRole('link', { name: 'Statistics' }))
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
    '0%',
  )
  expect(
    within(screen.getByRole('list', { name: 'Recent sessions' })).getByText(
      'In progress',
    ),
  ).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Continue Practice' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  await user.click(within(nav).getByRole('link', { name: 'Statistics' }))
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  expectMetrics(
    screen.getByRole('region', { name: 'All your practice' }),
    1,
    1,
    0,
    '100%',
  )
  expectMetrics(
    screen.getByRole('article', { name: 'Addition' }),
    1,
    1,
    0,
    '100%',
  )
  expectMetrics(
    screen.getByRole('article', { name: 'Division' }),
    0,
    0,
    0,
    '0%',
  )
  expectMetrics(
    screen.getByRole('article', { name: 'Level 4: Advanced' }),
    0,
    0,
    0,
    '0%',
  )
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)[0],
  ).not.toHaveProperty('completedAt')
})
