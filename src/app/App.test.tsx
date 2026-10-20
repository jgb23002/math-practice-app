import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('renders the Math Practice application shell', () => {
  render(<App />)

  const main = screen.getByRole('main')

  expect(
    within(main).getByRole('heading', { level: 1, name: 'Math Practice' }),
  ).toBeVisible()
  expect(
    within(main).getByText('A place to practice your math skills.'),
  ).toBeVisible()
})
