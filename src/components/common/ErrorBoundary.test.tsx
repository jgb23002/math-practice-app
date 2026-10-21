import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'
import RouteErrorPage from '../../pages/RouteErrorPage'
import TestRouter from '../../test/TestRouter'

afterEach(() => vi.restoreAllMocks())

test('a render exception shows a friendly fallback without erasing storage or exposing stack traces', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  localStorage.setItem('unrelated.data', 'keep')
  localStorage.setItem('mathPractice.settings', '{preserve for later recovery')
  let fail = true
  function BrokenScreen() {
    if (fail) throw new Error('Sensitive raw stack trace at Screen.tsx:10')
    return <p>Recovered screen</p>
  }
  render(
    <ErrorBoundary>
      <BrokenScreen />
    </ErrorBoundary>,
  )
  expect(screen.getByRole('main')).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'This page got a little mixed up',
  )
  expect(document.body).not.toHaveTextContent('Sensitive raw stack trace')
  expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute(
    'href',
    '/',
  )
  expect(localStorage.getItem('unrelated.data')).toBe('keep')
  expect(localStorage.getItem('mathPractice.settings')).toBe(
    '{preserve for later recovery',
  )
  fail = false
  await userEvent.click(screen.getByRole('button', { name: 'Try Again' }))
  expect(screen.getByText('Recovered screen')).toBeVisible()
})

test('a page boundary leaves surrounding navigation available', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenScreen(): never {
    throw new Error('Raw page stack trace')
  }
  render(
    <TestRouter>
      <nav aria-label="Available navigation">Navigation stays here</nav>
      <main>
        <ErrorBoundary page>
          <BrokenScreen />
        </ErrorBoundary>
      </main>
    </TestRouter>,
  )
  expect(screen.getByRole('navigation')).toBeVisible()
  expect(screen.getByRole('main')).toBeVisible()
  expect(screen.getByRole('alert')).toBeVisible()
  expect(document.body).not.toHaveTextContent('Raw page stack trace')
})

test('router failures use the custom fallback instead of the default stack-trace page', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter([
    {
      path: '*',
      element: <p>Page</p>,
      loader: () => {
        throw new Error('Private loader stack')
      },
      errorElement: <RouteErrorPage />,
    },
  ])
  render(<RouterProvider router={router} />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'We couldn’t open that page',
  )
  expect(document.body).not.toHaveTextContent('Private loader stack')
  expect(document.body).not.toHaveTextContent('Unexpected Application Error')
  expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute(
    'href',
    '/',
  )
})
