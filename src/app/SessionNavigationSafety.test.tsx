import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { expect, test } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import { createProgressPersistence } from '../services/progressPersistence'
import { createJsonStorage } from '../services/storage'
import {
  recoveryFixture,
  recoverySnapshot,
  reportRecoveryAnswer,
} from '../test/recoveryFixtures'
import App from './App'

function mount(
  path = '/practice/session',
  active = true,
  length: 5 | 'continuous' = 'continuous',
  recorded = 1,
  entries?: string[],
) {
  const { session, dependencies } = recoveryFixture(length)
  let current = session
  for (let index = 0; index < recorded; index++)
    current = reportRecoveryAnswer(current, dependencies, index % 2 === 0)
  if (active) {
    const snapshot = recoverySnapshot(current)
    expect(
      createProgressPersistence(createJsonStorage()).saveSession(
        snapshot.progress,
        current,
      ),
    ).toBe(true)
  }
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: entries ?? [path],
  })
  const view = render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return { router, view, current, user: userEvent.setup() }
}

function unload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

function navLink(name: string) {
  return within(
    screen.getByRole('navigation', { name: 'Main navigation' }),
  ).getByRole('link', { name })
}

test('staying preserves the revealed card, traps focus, and restores the initiating link', async () => {
  const { user, router } = mount()
  await user.click(screen.getAllByRole('button', { name: /^Answer \d+$/ })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const checkpoint = localStorage.getItem(STORAGE_KEYS.activeSession)
  const link = navLink('Settings')
  await user.click(link)
  const dialog = screen.getByRole('dialog', { name: 'Leave your practice?' })
  const stay = within(dialog).getByRole('button', { name: 'Keep Practicing' })
  expect(stay).toHaveFocus()
  await user.tab({ shift: true })
  expect(
    within(dialog).getByRole('button', { name: 'End Session and Leave' }),
  ).toHaveFocus()
  await user.tab()
  expect(stay).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/practice/session')
  expect(link).toHaveFocus()
  expect(screen.getByRole('button', { name: 'I Got It Right' })).toBeVisible()
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBe(checkpoint)
  await user.click(link)
  await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))
  expect(router.state.location.pathname).toBe('/practice/session')
})

test('Leave for Now keeps progress and offers a working resume link after refresh on another route', async () => {
  const { user, router, view } = mount()
  await user.click(screen.getAllByRole('button', { name: /^Answer \d+$/ })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(navLink('Settings'))
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  expect(router.state.location.pathname).toBe('/settings')
  expect(screen.getByText(/You’ve marked 1 answer/)).toBeVisible()
  view.unmount()
  const fresh = mount('/settings', false)
  await fresh.user.click(screen.getByRole('link', { name: 'Resume Session' }))
  expect(fresh.router.state.location.pathname).toBe('/practice/session')
  expect(screen.getByRole('button', { name: 'I Got It Right' })).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(unload()).toBe(true)
})

test('End Session and Leave records completion once and discards the unfinished answer', async () => {
  const { user, router, current } = mount()
  await user.click(screen.getAllByRole('button', { name: /^Answer \d+$/ })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(navLink('Statistics'))
  const leave = screen.getByRole('button', { name: 'End Session and Leave' })
  act(() => {
    fireEvent.click(leave)
    fireEvent.click(leave)
  })
  expect(router.state.location.pathname).toBe('/statistics')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)
  expect(
    sessions.filter((session: { id: string }) => session.id === current.id),
  ).toHaveLength(1)
  expect(sessions[0]).toMatchObject({
    attempted: 1,
    correct: 1,
    incorrect: 0,
    completedAt: expect.any(String),
  })
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(
    1,
  )
  expect(unload()).toBe(false)
  await user.click(navLink('Home'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('Back, Forward and programmatic navigation use the same confirmation', async () => {
  const { router, user } = mount('/practice/session', true, 'continuous', 1, [
    '/settings',
    '/practice/session',
  ])
  act(() => {
    void router.navigate(-1)
  })
  expect(screen.getByRole('dialog')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))
  expect(router.state.location.pathname).toBe('/practice/session')
  act(() => {
    void router.navigate(-1)
  })
  await user.click(screen.getByRole('button', { name: 'Leave for Now' }))
  expect(router.state.location.pathname).toBe('/settings')
  await act(() => router.navigate(1))
  expect(router.state.location.pathname).toBe('/practice/session')
  act(() => {
    void router.navigate('/statistics')
  })
  expect(screen.getByRole('dialog')).toBeVisible()
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { bubbles: false, cancelable: true }),
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/practice/session')
})

test('search and hash changes within the same card do not prompt', async () => {
  const { router } = mount()
  await act(() => router.navigate('/practice/session?view=card#main-content'))
  expect(router.state.location.search).toBe('?view=card')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(unload()).toBe(true)
})

test('fixed completion clears recovery and browser/internal navigation warnings', async () => {
  const { user, router } = mount('/practice/session', true, 5, 4)
  expect(unload()).toBe(true)
  await user.click(screen.getAllByRole('button', { name: /^Answer \d+$/ })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
  expect(router.state.location.pathname).toBe('/practice/summary')
  expect(unload()).toBe(false)
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(navLink('Home'))
  expect(router.state.location.pathname).toBe('/')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('ending continuous practice directly removes browser warnings without showing a navigation dialog', async () => {
  const { user } = mount()
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(unload()).toBe(false)
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
})

test.each([
  '/practice/session',
  '/practice/summary',
  '/settings',
  '/not-found',
])('direct access to %s handles an active recovery safely', async (path) => {
  const { user, router } = mount(path)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  if (path === '/practice/session' || path === '/practice/summary') {
    expect(router.state.location.pathname).toBe('/practice/session')
    expect(screen.getByText('Question 2')).toBeVisible()
  } else {
    expect(router.state.location.pathname).toBe(path)
    await user.click(screen.getByRole('link', { name: 'Resume Session' }))
    expect(screen.getByText('Question 2')).toBeVisible()
  }
})

test.each(['/practice/session', '/practice/summary'])(
  'direct access to %s without recovery reaches setup without a warning',
  (path) => {
    const { router } = mount(path, false)
    expect(router.state.location.pathname).toBe('/practice/setup')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(unload()).toBe(false)
  },
)

test('replacing a recovered session requires confirmation and completes the old session once', async () => {
  const { user, router, current } = mount('/practice/setup')
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(
    screen.getByRole('dialog', { name: 'Start a new practice?' }),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Keep Current Session' }))
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session.id,
  ).toBe(current.id)
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  const replace = screen.getByRole('button', { name: 'End and Start New' })
  act(() => {
    fireEvent.click(replace)
    fireEvent.click(replace)
  })
  expect(router.state.location.pathname).toBe('/practice/session')
  const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)
  expect(sessions).toHaveLength(2)
  expect(
    sessions.find((s: { id: string }) => s.id === current.id),
  ).toMatchObject({ completedAt: expect.any(String), attempted: 1 })
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session.id,
  ).not.toBe(current.id)
})

test('pagehide and hidden visibility checkpoint an active card without recording a result', () => {
  const { current } = mount()
  window.dispatchEvent(new Event('pagehide'))
  Object.defineProperty(document, 'visibilityState', {
    value: 'hidden',
    configurable: true,
  })
  try {
    document.dispatchEvent(new Event('visibilitychange'))
  } finally {
    delete (document as unknown as { visibilityState?: string }).visibilityState
  }
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session,
  ).toEqual(current)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toHaveLength(
    1,
  )
})
