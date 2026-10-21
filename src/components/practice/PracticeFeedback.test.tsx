import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import PracticeFeedback from './PracticeFeedback'

afterEach(() => vi.restoreAllMocks())

test('keeps feedback and its live region stable until another attempt is recorded', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0)
  const attempt = { id: 'first', selfReportedCorrect: true }
  const { rerender } = render(<PracticeFeedback enabled attempt={attempt} />)
  const status = screen.getByRole('status', { name: 'Practice encouragement' })
  expect(status).toHaveAttribute('aria-live', 'polite')
  expect(status).toHaveAttribute('aria-atomic', 'true')
  expect(status).toHaveTextContent('Nice work! Keep being curious.')
  const calls = random.mock.calls.length
  random.mockReturnValue(0.999999)
  rerender(<PracticeFeedback enabled attempt={{ ...attempt }} />)
  expect(status).toHaveTextContent('Nice work! Keep being curious.')
  expect(random).toHaveBeenCalledTimes(calls)
  rerender(
    <PracticeFeedback
      enabled
      attempt={{ id: 'second', selfReportedCorrect: false }}
    />,
  )
  expect(screen.getByRole('status', { name: 'Practice encouragement' })).toBe(
    status,
  )
  expect(status).toHaveTextContent('Take a breath. One small step at a time.')
})

test('allows encouraging messages and their announcements to be disabled', () => {
  const { rerender } = render(<PracticeFeedback enabled={false} />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  rerender(<PracticeFeedback enabled />)
  expect(screen.getByRole('status')).toHaveTextContent('Take your time.')
  rerender(<PracticeFeedback enabled={false} />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
