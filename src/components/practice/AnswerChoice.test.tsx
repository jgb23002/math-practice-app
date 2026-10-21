import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import AnswerChoice from './AnswerChoice'

test('displays an accessible answer button and reflects controlled selection', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  const { rerender } = render(
    <AnswerChoice answer={0} selected={false} onSelect={onSelect} />,
  )
  const answer = screen.getByRole('button', {
    name: 'Answer 0',
    pressed: false,
  })
  await user.click(answer)
  expect(onSelect).toHaveBeenCalledWith(0)
  rerender(<AnswerChoice answer={0} selected onSelect={onSelect} />)
  expect(answer).toHaveAttribute('aria-pressed', 'true')
  expect(answer).toHaveClass('is-selected')
  expect(answer.parentElement).toHaveTextContent('✓ Selected')
  expect(answer).toHaveTextContent(/^0$/)
  expect(answer).toHaveAccessibleName('Answer 0')
})

test('supports native keyboard activation with Space and Enter', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<AnswerChoice answer={7} selected={false} onSelect={onSelect} />)
  await user.tab()
  expect(screen.getByRole('button', { name: 'Answer 7' })).toHaveFocus()
  await user.keyboard(' {Enter}')
  expect(onSelect).toHaveBeenCalledTimes(2)
})

test('does not allow selection when disabled', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<AnswerChoice answer={7} selected disabled onSelect={onSelect} />)
  const answer = screen.getByRole('button', { name: 'Answer 7' })
  await user.click(answer)
  fireEvent.click(answer)
  await user.tab()
  expect(answer).not.toHaveFocus()
  expect(onSelect).not.toHaveBeenCalled()
})

test.each([false, true])(
  'keeps visible shortcut/status hints separate from the numeric button label (selected=%s)',
  (selected) => {
    render(
      <AnswerChoice
        answer={3}
        shortcutKey={4}
        selected={selected}
        onSelect={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', {
      name: 'Answer 3',
      pressed: selected,
    })
    expect(button).toHaveTextContent(/^3$/)
    expect(button).toHaveAttribute('aria-keyshortcuts', '4')
    expect(button.parentElement).toHaveTextContent(
      selected ? '✓ Selected' : 'Pick me',
    )
    expect(button.parentElement?.querySelector('kbd')).toHaveTextContent('4')
    expect(button.querySelector('[aria-hidden]')).toBeNull()
  },
)
