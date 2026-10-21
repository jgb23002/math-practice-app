import TestRouter from '../test/TestRouter'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../app/App'
import { createDefaultSettings, STORAGE_KEYS } from '../config/storage'
import {
  CLEAR_DATA_WARNING,
  saveStoredProgress,
} from '../services/progressPersistence'
import * as questionGenerator from '../services/questionGenerator'
import { createJsonStorage } from '../services/storage'
import { createQuestion } from '../test/questionFixtures'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createStatisticsProgress } from '../test/statisticsFixtures'
import type { StoredProgress } from '../types/persistence'

afterEach(() => vi.restoreAllMocks())

function renderApp(path = '/settings', progress?: StoredProgress) {
  if (progress)
    expect(saveStoredProgress(createJsonStorage(), progress)).toBe(true)
  const view = render(
    <TestRouter initialEntries={[path]}>
      <App />
    </TestRouter>,
  )
  return { user: userEvent.setup(), ...view }
}
const storedSettings = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!)
const clearLabel = 'Clear All Application Data'

test('saves the encouragement preference, applies it to practice, and retains existing progress', async () => {
  const progress = createStatisticsProgress()
  delete progress.settings.feedbackEnabled // A pre-Phase-17 settings record.
  const { user, unmount } = renderApp('/settings', progress)
  expect(
    screen.getByRole('checkbox', { name: 'Encouraging messages' }),
  ).toBeChecked()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await user.click(
    screen.getByRole('checkbox', { name: 'Encouraging messages' }),
  )
  expect(storedSettings().feedbackEnabled).toBe(false)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual(
    progress.attempts,
  )
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.statistics)!)).toEqual(
    progress.statistics,
  )
  unmount()
  const next = renderApp()
  expect(
    screen.getByRole('checkbox', { name: 'Encouraging messages' }),
  ).not.toBeChecked()
  await next.user.click(screen.getByRole('link', { name: 'Start Practice' }))
  await next.user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(
    screen.queryByRole('status', { name: 'Practice encouragement' }),
  ).not.toBeInTheDocument()
  const answer = within(
    screen.getByRole('group', { name: 'Choose one answer' }),
  ).getAllByRole('button')[0]
  await next.user.click(answer)
  await next.user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const before = localStorage.getItem(STORAGE_KEYS.attempts)
  await next.user.click(
    within(screen.getByRole('navigation')).getByRole('link', {
      name: 'Settings',
    }),
  )
  await next.user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  await next.user.click(
    screen.getByRole('checkbox', { name: 'Encouraging messages' }),
  )
  await next.user.click(screen.getByRole('link', { name: 'Continue Practice' }))
  expect(
    screen.getByRole('status', { name: 'Practice encouragement' }),
  ).toHaveTextContent('Take your time.')
  expect(screen.getByText('Your answer').nextElementSibling).toHaveTextContent(
    answer.getAttribute('aria-label')!.replace('Answer ', ''),
  )
  expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe(before)
})

test('loads safe defaults and saves every visible setting automatically across remounts', async () => {
  const { user, unmount } = renderApp()
  expect(document.title).toBe('Settings | Math Practice')
  expect(
    screen.getByRole('checkbox', { name: 'Sound effects' }),
  ).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Card animation' })).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'Show explanations' }),
  ).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 1: Beginner' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'Sound effects' }),
  ).toHaveAccessibleDescription(/gentle chime/)
  await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
  await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
  await user.click(screen.getByRole('checkbox', { name: 'Show explanations' }))
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Division' }))
  await user.click(screen.getByRole('radio', { name: 'Level 4: Advanced' }))
  await user.click(screen.getByRole('radio', { name: '20 questions' }))
  expect(storedSettings()).toEqual({
    ...createDefaultSettings(),
    soundEnabled: true,
    animationsEnabled: false,
    showExplanations: false,
    defaultOperations: ['addition', 'division'],
    defaultDifficulty: 4,
    defaultSessionLength: 20,
  })
  unmount()
  renderApp()
  expect(screen.getByRole('checkbox', { name: 'Sound effects' })).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'Card animation' }),
  ).not.toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'Show explanations' }),
  ).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 4: Advanced' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
  await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
  await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
  await user.click(screen.getByRole('checkbox', { name: 'Show explanations' }))
  expect(storedSettings()).toMatchObject({
    soundEnabled: false,
    animationsEnabled: true,
    showExplanations: true,
  })
})

test.each([5, 10, 20, 'continuous'] as const)(
  'applies saved %s defaults to new practice instead of the most recent session',
  async (sessionLength) => {
    const progress = createStatisticsProgress()
    progress.settings = {
      ...progress.settings,
      defaultOperations: ['addition'],
      defaultDifficulty: 2,
      defaultSessionLength: sessionLength,
    }
    const { user } = renderApp('/practice/setup', progress)
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Level 2: Easy' })).toBeChecked()
    expect(
      screen.getByRole('radio', {
        name:
          sessionLength === 'continuous'
            ? 'Continuous practice'
            : `${sessionLength} questions`,
      }),
    ).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    const plan = screen.getByLabelText('Your selected practice configuration')
    expect(within(plan).getByText('Addition')).toBeVisible()
    expect(within(plan).getByText('Level 2: Easy')).toBeVisible()
    expect(
      within(plan).getByText(
        sessionLength === 'continuous'
          ? 'Continuous practice'
          : `${sessionLength} questions`,
      ),
    ).toBeVisible()
  },
)

test('allows session-only overrides, preserves them when editing, and uses defaults again for fresh practice', async () => {
  vi.spyOn(questionGenerator, 'generateQuestion').mockReturnValue(
    createQuestion({
      operation: 'multiplication',
      difficulty: 3,
      firstOperand: 3,
      secondOperand: 4,
      correctAnswer: 12,
      displayText: '3 × 4 = ?',
      choices: [10, 11, 12, 13],
    }),
  )
  const { user } = renderApp()
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Division' }))
  await user.click(screen.getByRole('radio', { name: 'Level 2: Easy' }))
  await user.click(screen.getByRole('radio', { name: '5 questions' }))
  const defaults = storedSettings()
  await user.click(screen.getByRole('link', { name: 'Start Practice' }))
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
  await user.click(screen.getByRole('radio', { name: 'Level 3: Intermediate' }))
  await user.click(screen.getByRole('radio', { name: '20 questions' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(
    screen.getByLabelText('Your selected practice configuration'),
  ).toHaveTextContent('Multiplication, Division')
  expect(storedSettings()).toEqual(defaults)
  await user.click(screen.getByRole('link', { name: 'Explore Practice' }))
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  expect(screen.getByRole('checkbox', { name: 'Multiplication' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
  expect(
    screen.getByRole('radio', { name: 'Level 3: Intermediate' }),
  ).toBeChecked()
  expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
  await user.click(
    within(screen.getByRole('navigation')).getByRole('link', { name: 'Home' }),
  )
  await user.click(screen.getByRole('link', { name: 'Start Practice' }))
  expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'Multiplication' }),
  ).not.toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 2: Easy' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()
  expect(storedSettings()).toEqual(defaults)
})

test('animation and explanation preferences apply to a revealed card without changing the answer or result', async () => {
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
  const { user } = renderApp('/practice/setup')
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(
    screen.getByRole('heading', { name: 'Let’s think it through' }),
  ).toBeVisible()
  await user.click(
    within(screen.getByRole('navigation')).getByRole('link', {
      name: 'Settings',
    }),
  )
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
  await user.click(screen.getByRole('checkbox', { name: 'Show explanations' }))
  await user.click(screen.getByRole('link', { name: 'Continue Practice' }))
  expect(screen.queryByText('Let’s think it through')).not.toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'Question 1' })).toHaveClass(
    'question-card--static',
  )
  expect(screen.getByText('Your answer').nextElementSibling).toHaveTextContent(
    '6',
  )
  expect(
    screen.getByText('Correct answer').nextElementSibling,
  ).toHaveTextContent('7')
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  await user.click(
    within(screen.getByRole('navigation')).getByRole('link', {
      name: 'Settings',
    }),
  )
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
  await user.click(screen.getByRole('checkbox', { name: 'Show explanations' }))
  await user.click(screen.getByRole('link', { name: 'Continue Practice' }))
  await user.click(screen.getByRole('button', { name: 'Answer 6' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(
    screen.getByRole('heading', { name: 'Let’s think it through' }),
  ).toBeVisible()
  expect(
    screen.getByText('Correct answer').nextElementSibling,
  ).toHaveTextContent('8')
})

test('corrupt settings recover independently from valid practice history', () => {
  const progress = createStatisticsProgress()
  expect(saveStoredProgress(createJsonStorage(), progress)).toBe(true)
  localStorage.setItem(STORAGE_KEYS.settings, '{broken')
  renderApp()
  expect(storedSettings()).toEqual(createDefaultSettings())
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual(
    progress.attempts,
  )
  expect(screen.getByText(/Some saved progress couldn’t be read/)).toBeVisible()
})

test('keyboard toggles save preferences and preserve a custom mastery threshold', async () => {
  const progress = createStatisticsProgress()
  progress.settings.masteryThreshold = 5
  const { user } = renderApp('/settings', progress)
  screen.getByRole('checkbox', { name: 'Show explanations' }).focus()
  await user.keyboard(' ')
  expect(storedSettings()).toMatchObject({
    masteryThreshold: 5,
    showExplanations: false,
  })
})

test('cancelling Clear All leaves settings, history, and the route unchanged', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const { user } = renderApp('/settings', createStatisticsProgress())
  const snapshot = JSON.stringify(localStorage)
  const button = screen.getByRole('button', { name: clearLabel })
  expect(button).toHaveAccessibleDescription(/permanently erases/)
  await user.click(button)
  expect(confirm).toHaveBeenCalledWith(
    expect.stringContaining('This cannot be undone.'),
  )
  expect(JSON.stringify(localStorage)).toBe(snapshot)
  expect(
    screen.getByRole('heading', { name: 'Make it feel like you' }),
  ).toBeVisible()
})

test('confirmed Clear All erases progress and mistake patterns, restores defaults, and returns home', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const progress = createStatisticsProgress()
  progress.mistakePatterns = [createMistakePattern()]
  const { user, unmount } = renderApp('/settings', progress)
  localStorage.setItem('other.app.preference', 'stay')
  screen.getByRole('button', { name: clearLabel }).focus()
  await user.keyboard('{Enter}')
  expect(
    screen.getByRole('heading', {
      name: 'A little practice. A big adventure.',
    }),
  ).toBeVisible()
  expect(storedSettings()).toEqual(createDefaultSettings())
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)).toEqual([])
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.statistics)!).attempted,
  ).toBe(0)
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!),
  ).toEqual([])
  expect(localStorage.getItem('other.app.preference')).toBe('stay')
  unmount()
  renderApp()
  expect(storedSettings()).toEqual(createDefaultSettings())
  expect(
    screen.getByRole('checkbox', { name: 'Sound effects' }),
  ).not.toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 1: Beginner' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
})

test('rapid Clear All clicks ask once and remove each application key once', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  renderApp('/settings', createStatisticsProgress())
  const remove = vi.spyOn(Storage.prototype, 'removeItem')
  const button = screen.getByRole('button', { name: clearLabel })
  act(() => {
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
  })
  expect(confirm).toHaveBeenCalledTimes(1)
  expect(remove).toHaveBeenCalledTimes(Object.keys(STORAGE_KEYS).length)
  expect(
    screen.getByRole('heading', {
      name: 'A little practice. A big adventure.',
    }),
  ).toBeVisible()
})

test('partial deletion keeps the page open, blocks autosaves, and allows an explicit retry', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { user } = renderApp('/settings', createStatisticsProgress())
  const original = Storage.prototype.removeItem
  const remove = vi
    .spyOn(Storage.prototype, 'removeItem')
    .mockImplementation(function (this: Storage, key: string) {
      if (key === STORAGE_KEYS.attempts)
        throw new DOMException('Blocked', 'SecurityError')
      original.call(this, key)
    })
  await user.click(screen.getByRole('button', { name: clearLabel }))
  expect(
    screen.getByRole('heading', { name: 'Make it feel like you' }),
  ).toBeVisible()
  expect(screen.getByText(CLEAR_DATA_WARNING)).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Please try again')
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(
    8,
  )
  expect(localStorage.getItem(STORAGE_KEYS.settings)).toBeNull()
  await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
  expect(localStorage.getItem(STORAGE_KEYS.settings)).toBeNull()
  remove.mockRestore()
  await user.click(screen.getByRole('button', { name: clearLabel }))
  expect(
    screen.getByRole('heading', {
      name: 'A little practice. A big adventure.',
    }),
  ).toBeVisible()
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  expect(storedSettings()).toEqual(createDefaultSettings())
})
