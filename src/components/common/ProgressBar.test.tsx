import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import ProgressBar from './ProgressBar'

test('announces question position and updates when its parent supplies a new position', () => {
  const { rerender } = render(<ProgressBar current={1} total={10} />)
  const progress = screen.getByRole('progressbar', {
    name: 'Question progress',
  })
  expect(progress).toHaveAttribute('aria-valuenow', '1')
  expect(progress).toHaveAttribute('aria-valuemin', '0')
  expect(progress).toHaveAttribute('aria-valuemax', '10')
  expect(progress).toHaveAttribute('aria-valuetext', 'Question 1 of 10')
  rerender(<ProgressBar current={10} total={10} />)
  expect(progress).toHaveAttribute('aria-valuenow', '10')
  expect(progress).toHaveAttribute('aria-valuetext', 'Question 10 of 10')
})
