import { StrictMode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import {
  createProgressPersistence,
  saveStoredProgress,
} from '../services/progressPersistence'
import { createJsonStorage } from '../services/storage'
import * as generator from '../services/questionGenerator'
import * as fallback from '../services/fallbackQuestion'
import * as ids from '../utils/ids'
import * as statistics from '../utils/statistics'
import * as sessions from '../services/practiceSession'
import { recoveryFixture, recoverySnapshot } from '../test/recoveryFixtures'
import { createQuestion } from '../test/questionFixtures'
import { createStatisticsProgress } from '../test/statisticsFixtures'
import TestRouter from '../test/TestRouter'
import App from './App'

afterEach(() => vi.restoreAllMocks())

function mount(path = '/') {
  const user = userEvent.setup()
  const view = render(
    <StrictMode>
      <TestRouter initialEntries={[path]}>
        <App />
      </TestRouter>
    </StrictMode>,
  )
  return { user, ...view }
}

function saveCard(questionError?: string) {
  const { session } = recoveryFixture()
  const snapshot = recoverySnapshot(
    questionError
      ? { ...session, currentQuestion: null, questionError }
      : session,
  )
  expect(
    createProgressPersistence(createJsonStorage()).saveSession(
      snapshot.progress,
      snapshot.session,
    ),
  ).toBe(true)
  return snapshot
}

async function start(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
}

test.each(['/practice/session', '/practice/summary'])(
  'missing state at %s explains what happened and provides a working home action',
  async (path) => {
    const { user } = mount(path)
    expect(screen.getByRole('alert')).toHaveTextContent(
      path.endsWith('summary')
        ? 'There isn’t a finished practice'
        : 'We couldn’t find an active practice',
    )
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
    await user.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(screen.getByRole('link', { name: 'Start Practice' })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  },
)

test.each([
  'settings',
  'attempts',
  'sessions',
  'mistakePatterns',
  'statistics',
] as const)(
  'a corrupted %s category does not crash the dashboard or clear other categories',
  async (category) => {
    const storage = createJsonStorage()
    const progress = createStatisticsProgress()
    progress.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    expect(saveStoredProgress(storage, progress)).toBe(true)
    const keys = Object.values(STORAGE_KEYS).filter(
      (key) =>
        key !== STORAGE_KEYS[category] && key !== STORAGE_KEYS.statistics,
    )
    const before = new Map(keys.map((key) => [key, localStorage.getItem(key)]))
    localStorage.setItem(
      STORAGE_KEYS[category],
      '{corrupted secret stack trace',
    )
    localStorage.setItem('unrelated.data', 'keep')
    const { user } = mount('/statistics')
    expect(
      screen.getByRole('heading', { name: 'See how you grow' }),
    ).toBeVisible()
    expect(
      screen.getByText(/Some saved progress couldn’t be read/),
    ).toBeVisible()
    expect(document.body).not.toHaveTextContent('secret stack trace')
    for (const [key, value] of before)
      expect(localStorage.getItem(key)).toBe(value)
    expect(localStorage.getItem('unrelated.data')).toBe('keep')
    await user.click(
      within(
        screen.getByRole('navigation', { name: 'Main navigation' }),
      ).getByRole('link', { name: 'Home' }),
    )
    expect(screen.getByRole('link', { name: 'Start Practice' })).toBeVisible()
  },
)

test('duplicate answer options are never rendered and a validated fallback supports a recorded result', async () => {
  const generate = vi
    .spyOn(generator, 'generateQuestion')
    .mockReturnValue(createQuestion({ choices: [7, 7, 8, 9] }))
  const { user } = mount('/practice/setup')
  await start(user)
  expect(generate).toHaveBeenCalledTimes(3)
  const answers = screen.getAllByRole('button', { name: /^Answer \d+$/ })
  expect(answers).toHaveLength(4)
  expect(
    new Set(answers.map((button) => button.getAttribute('aria-label'))).size,
  ).toBe(4)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  await user.click(answers[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(
    1,
  )
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
})

test('a stored generation-error string is never shown as raw technical details', async () => {
  saveCard('TypeError: secret-stack.ts:123 <script>alert(1)</script>')
  const { user } = mount('/practice/session')
  expect(screen.getByRole('alert')).toHaveTextContent(
    'That card got a little tangled',
  )
  expect(document.body).not.toHaveTextContent('TypeError')
  expect(document.body).not.toHaveTextContent('secret-stack')
  await user.click(screen.getByRole('link', { name: 'Return Home' }))
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  expect(screen.getByRole('link', { name: 'Start Practice' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Resume Session' })).toBeVisible()
})

test('exhausted primary/fallback failures show retry and home, then recover the same session', async () => {
  const generate = vi
    .spyOn(generator, 'generateQuestion')
    .mockImplementation(() => {
      throw new Error('Generator raw stack')
    })
  vi.spyOn(fallback, 'generateFallbackQuestion').mockImplementation(() => {
    throw new Error('Fallback raw stack')
  })
  const { user } = mount('/practice/setup')
  await start(user)
  const id = JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!)
    .session.id
  expect(generate).toHaveBeenCalledTimes(3)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your marked answers are safe',
  )
  expect(document.body).not.toHaveTextContent('raw stack')
  expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute(
    'href',
    '/',
  )
  generate.mockReturnValue(createQuestion())
  await user.click(screen.getByRole('button', { name: 'Try Again' }))
  expect(screen.getByRole('heading', { name: '3 + 4 = ?' })).toBeVisible()
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session.id,
  ).toBe(id)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
})

test('a failed start action stays usable, hides technical details, and can be retried', async () => {
  const { user } = mount('/practice/setup')
  vi.spyOn(ids, 'createUniqueId').mockImplementationOnce(() => {
    throw new Error('Crypto private stack')
  })
  await start(user)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your practice couldn’t start yet',
  )
  expect(document.body).not.toHaveTextContent('Crypto private stack')
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('failure while preparing a mistake rolls back the whole result and allows an exact-once retry', async () => {
  saveCard()
  vi.spyOn(generator, 'generateQuestion').mockReturnValue(
    createQuestion({ id: 'next-card' }),
  )
  const { user } = mount('/practice/session')
  await user.click(screen.getByRole('button', { name: 'Answer 0' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const before = localStorage.getItem(STORAGE_KEYS.activeSession)
  vi.spyOn(ids, 'createUniqueId')
    .mockReturnValueOnce('attempt-id')
    .mockImplementationOnce(() => {
      throw new Error('Pattern ID private stack')
    })
  await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Please try again')
  expect(document.body).not.toHaveTextContent('Pattern ID private stack')
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBe(before)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
  expect(screen.getByRole('button', { name: 'I Got It Wrong' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(
    1,
  )
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!)[0]
      .incorrectCount,
  ).toBe(1)
  expect(screen.getByText('Question 2 of 5')).toBeVisible()
})

test('denied storage reads show a friendly warning and still permit a full in-memory practice step', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Private storage internals', 'SecurityError')
  })
  const { user } = mount('/practice/setup')
  expect(screen.getByText(/We can’t save your progress/)).toBeVisible()
  expect(document.body).not.toHaveTextContent('Private storage internals')
  await start(user)
  await user.click(screen.getAllByRole('button', { name: /^Answer \d+$/ })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(screen.getByText('Question 2 of 10')).toBeVisible()
})

test('an unexpected route during active recovery keeps the card and provides safe home and resume actions', async () => {
  const snapshot = saveCard()
  const { user } = mount('/practice/not-a-real-route')
  expect(
    screen.getByRole('heading', { name: 'Oops! This page wandered off.' }),
  ).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Return Home' }))
  expect(screen.getByRole('link', { name: 'Resume Session' })).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Resume Session' }))
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session.id,
  ).toBe(snapshot.session!.id)
  act(() => {
    window.dispatchEvent(new Event('pagehide'))
  })
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
})

test('an unexpected page render failure keeps navigation and active recovery available', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  saveCard()
  const before = localStorage.getItem(STORAGE_KEYS.activeSession)
  vi.spyOn(statistics, 'getRecentSessions').mockImplementation(() => {
    throw new Error('Private render stack')
  })
  const { user } = mount('/statistics')
  expect(
    screen.getByRole('heading', { name: 'Let’s find our way back' }),
  ).toHaveFocus()
  expect(
    screen.getByRole('navigation', { name: 'Main navigation' }),
  ).toBeVisible()
  expect(document.body).not.toHaveTextContent('Private render stack')
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBe(before)
  await user.click(screen.getByRole('link', { name: 'Return Home' }))
  expect(screen.getByRole('link', { name: 'Start Practice' })).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Resume Session' }))
  expect(screen.getByRole('button', { name: 'Answer 0' })).toBeVisible()
})

test('a failed end action does not confirm navigation until ending succeeds', async () => {
  saveCard()
  const { user } = mount('/practice/session')
  await user.click(
    within(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).getByRole('link', { name: 'Settings' }),
  )
  vi.spyOn(sessions, 'transitionPracticeSession').mockImplementationOnce(() => {
    throw new Error('Private completion stack')
  })
  await user.click(
    screen.getByRole('button', { name: 'End Session and Leave' }),
  )
  expect(
    within(screen.getByRole('dialog')).getByRole('alert'),
  ).toHaveTextContent('We couldn’t end practice yet')
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session
      .isActive,
  ).toBe(true)
  expect(
    screen.queryByRole('heading', { name: 'Make it feel like you' }),
  ).not.toBeInTheDocument()
  expect(document.body).not.toHaveTextContent('Private completion stack')
  await user.click(
    screen.getByRole('button', { name: 'End Session and Leave' }),
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Make it feel like you' }),
  ).toBeVisible()
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
})
