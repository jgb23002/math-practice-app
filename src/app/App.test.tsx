import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App'

function renderApp(path = '/') {
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

  return user
}

test('welcomes children with the application title and three main actions', () => {
  renderApp()

  const main = screen.getByRole('main')

  expect(
    within(screen.getByRole('banner')).getByRole('link', {
      name: 'Math Practice home',
    }),
  ).toBeVisible()
  expect(
    within(main).getByRole('heading', {
      level: 1,
      name: 'A little practice. A big adventure.',
    }),
  ).toBeVisible()
  expect(
    within(main).getByText(/Welcome to your happy place for math/),
  ).toBeVisible()
  expect(
    within(main).getByRole('link', { name: 'Start Practice' }),
  ).toHaveAttribute('href', '/practice/setup')
  expect(
    within(main).getByRole('link', { name: 'View Statistics' }),
  ).toHaveAttribute('href', '/statistics')
  expect(within(main).getByRole('link', { name: 'Settings' })).toHaveAttribute(
    'href',
    '/settings',
  )
})

test.each([
  ['/', 'A little practice. A big adventure.', 'Home'],
  ['/practice/setup', 'Your next math adventure', 'Practice'],
  ['/practice/session', 'Your next math adventure', 'Practice'],
  ['/practice/summary', 'Your next math adventure', 'Practice'],
  ['/statistics', 'See how you grow', 'Statistics'],
  ['/settings', 'Make it feel like you', 'Settings'],
])(
  'renders %s with shared navigation and the correct active section',
  (path, heading, activeLink) => {
    renderApp(path)

    expect(
      within(screen.getByRole('main')).getByRole('heading', {
        level: 1,
        name: heading,
      }),
    ).toBeVisible()
    const navigation = screen.getByRole('navigation', {
      name: 'Main navigation',
    })
    expect(
      within(navigation).getByRole('link', { name: activeLink }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(navigation).getAllByRole('link', { current: 'page' }),
    ).toHaveLength(1)
    expect(screen.getByRole('contentinfo')).toBeVisible()

    if (path === '/statistics' || path === '/settings') {
      expect(screen.getByText('Coming soon')).toBeVisible()
    }
  },
)

test.each([
  ['Start Practice', 'Your next math adventure', 'Practice setup'],
  ['View Statistics', 'See how you grow', 'Statistics'],
  ['Settings', 'Make it feel like you', 'Settings'],
])(
  'opens the correct page from %s and updates focus and the page title',
  async (label, heading, title) => {
    const user = renderApp()

    await user.click(
      within(screen.getByRole('main')).getByRole('link', { name: label }),
    )

    expect(
      screen.getByRole('heading', { name: heading, level: 1 }),
    ).toBeVisible()
    expect(screen.getByRole('main')).toHaveFocus()
    expect(document.title).toBe(`${title} | Math Practice`)
  },
)

test('supports the skip link and keyboard-only navigation into practice', async () => {
  const user = renderApp()
  const startLink = screen.getByRole('link', { name: 'Start Practice' })

  await user.tab()
  expect(
    screen.getByRole('link', { name: 'Skip to main content' }),
  ).toHaveFocus()
  expect(document.activeElement).toHaveAttribute('href', '#main-content')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')

  for (
    let index = 0;
    index < 8 && document.activeElement !== startLink;
    index++
  ) {
    await user.tab()
  }

  expect(startLink).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(
    screen.getByRole('heading', { name: 'Your next math adventure' }),
  ).toBeVisible()
  expect(screen.getByRole('main')).toHaveFocus()
})

test('keeps navigation usable between placeholder pages and home', async () => {
  const user = renderApp('/practice/session')
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' })

  await user.click(within(navigation).getByRole('link', { name: 'Settings' }))
  expect(
    screen.getByRole('heading', { name: 'Make it feel like you' }),
  ).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Math Practice home' }))
  expect(screen.getByRole('link', { name: 'Start Practice' })).toBeVisible()
})

test('shows a friendly fallback for unknown routes and allows returning home', async () => {
  const user = renderApp('/a-page-that-does-not-exist')

  expect(
    screen.getByRole('heading', { name: 'Oops! This page wandered off.' }),
  ).toBeVisible()
  expect(document.title).toBe('Page not found | Math Practice')
  await user.click(screen.getByRole('link', { name: 'Return Home' }))
  expect(screen.getByRole('link', { name: 'Start Practice' })).toBeVisible()
  expect(document.title).toBe('Home | Math Practice')
})
