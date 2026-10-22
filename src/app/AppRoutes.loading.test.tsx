import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import TestRouter from '../test/TestRouter'
import App from './App'

vi.mock('../pages/SettingsPage', async (importOriginal) => {
  await new Promise((resolve) => setTimeout(resolve, 20))
  return importOriginal()
})
vi.mock('../pages/StatisticsPage', async () => {
  throw new Error(
    'Simulated chunk download failure: internal technical details',
  )
})
afterEach(() => vi.restoreAllMocks())

test('a lazy page has an accessible loading state and then renders the real settings page', async () => {
  render(
    <TestRouter initialEntries={['/settings']}>
      <App />
    </TestRouter>,
  )
  expect(screen.getByRole('main')).toHaveAccessibleName(
    'Getting your page ready',
  )
  expect(screen.getByRole('status')).toHaveTextContent('Just a moment…')
  expect(
    await screen.findByRole('heading', { name: 'Make it feel like you' }),
  ).toBeVisible()
  expect(screen.queryByText('Just a moment…')).not.toBeInTheDocument()
  // The heading can appear before the page's title-setting effect runs.
  await waitFor(() => {
    expect(document.title).toBe('Settings | Math Practice')
  })
})

test('a failed lazy download shows a friendly error and allows returning home', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const user = userEvent.setup()
  render(
    <TestRouter initialEntries={['/statistics']}>
      <App />
    </TestRouter>,
  )
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(
    screen.queryByText(/internal technical details/),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Return Home' }))
  expect(
    screen.getByRole('heading', {
      name: 'A little practice. A big adventure.',
    }),
  ).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
