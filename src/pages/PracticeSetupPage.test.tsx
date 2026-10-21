import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from '../app/App'

function renderSetup() {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
    </MemoryRouter>,
  )
  return user
}

test('starts with no chosen skills, the Beginner default, and 10 questions', () => {
  renderSetup()
  expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0)
  const difficulty = screen.getByRole('group', { name: 'Find your level' })
  expect(
    within(difficulty).queryAllByRole('radio', { checked: true }),
  ).toHaveLength(1)
  expect(
    within(difficulty).getByRole('radio', { name: 'Level 1: Beginner' }),
  ).toBeChecked()
  expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Choose at least one math skill to start.',
  )
})

test.each(['Addition', 'Subtraction', 'Multiplication', 'Division'])(
  'allows selecting and deselecting %s',
  async (name) => {
    const user = renderSetup()
    const option = screen.getByRole('checkbox', { name })
    await user.click(option)
    expect(option).toBeChecked()
    await user.click(option)
    expect(option).not.toBeChecked()
  },
)

test('keeps multiple operations selected independently', async () => {
  const user = renderSetup()
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Division' }))
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2)
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
})

test('selects all operations with Mixed operations and reflects individual changes', async () => {
  const user = renderSetup()
  const mixed = screen.getByRole('button', { name: 'Mixed operations' })
  await user.click(mixed)
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(4)
  expect(mixed).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('checkbox', { name: 'Subtraction' }))
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(3)
  expect(mixed).toHaveAttribute('aria-pressed', 'false')
  await user.click(mixed)
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(4)
  await user.click(mixed)
  expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0)
  expect(mixed).toHaveAttribute('aria-pressed', 'false')
})

test('provides four described difficulty levels and allows exactly one selection', async () => {
  const user = renderSetup()
  const group = screen.getByRole('group', { name: 'Find your level' })
  const options = [
    ['Level 1: Beginner', /small numbers/],
    ['Level 2: Easy', /times tables/],
    ['Level 3: Intermediate', /carrying, borrowing/],
    ['Level 4: Advanced', /larger numbers/],
  ] as const
  for (const [name, description] of options) {
    const option = within(group).getByRole('radio', { name })
    expect(option).toHaveAccessibleDescription(description)
    await user.click(option)
    expect(option).toBeChecked()
    expect(within(group).getAllByRole('radio', { checked: true })).toHaveLength(
      1,
    )
  }
})

test('offers all four session lengths and keeps one selected', async () => {
  const user = renderSetup()
  const group = screen.getByRole('group', { name: 'Choose your practice time' })
  for (const name of [
    '5 questions',
    '20 questions',
    'Continuous practice',
    '10 questions',
  ]) {
    const option = within(group).getByRole('radio', { name })
    await user.click(option)
    expect(option).toBeChecked()
    expect(within(group).getAllByRole('radio', { checked: true })).toHaveLength(
      1,
    )
  }
})

test('uses the default difficulty and disables Start when all operations are removed', async () => {
  const user = renderSetup()
  const start = screen.getByRole('button', { name: 'Start Session' })
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  expect(start).toBeEnabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Your choices look good. Let’s go!',
  )
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  expect(start).toBeEnabled()
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  expect(start).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Choose at least one math skill to start.',
  )
})

test('does not start from a difficulty selection alone or from a forced invalid form submission', async () => {
  const user = renderSetup()
  await user.click(screen.getByRole('radio', { name: 'Level 2: Easy' }))
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
  fireEvent.submit(
    screen.getByRole('form', { name: 'Your next math adventure' }),
  )
  expect(
    screen.getByRole('heading', { name: 'Your next math adventure' }),
  ).toBeVisible()
  expect(
    screen.queryByLabelText('Your selected practice configuration'),
  ).not.toBeInTheDocument()
})

test('passes the complete configuration to the session page and restores it for editing', async () => {
  const user = renderSetup()
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Division' }))
  await user.click(screen.getByRole('radio', { name: 'Level 3: Intermediate' }))
  await user.click(screen.getByRole('radio', { name: '20 questions' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))

  expect(
    screen.getByRole('heading', { name: 'Your practice space' }),
  ).toBeVisible()
  const plan = screen.getByLabelText('Your selected practice configuration')
  expect(within(plan).getByText('Addition, Division')).toBeVisible()
  expect(within(plan).getByText('Level 3: Intermediate')).toBeVisible()
  expect(within(plan).getByText('20 questions')).toBeVisible()
  expect(screen.getByRole('main')).toHaveFocus()

  await user.click(screen.getByRole('link', { name: 'Explore Practice' }))
  expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'Subtraction' }),
  ).not.toBeChecked()
  expect(
    screen.getByRole('radio', { name: 'Level 3: Intermediate' }),
  ).toBeChecked()
  expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
})

test('supports Space on operations, arrow keys on radio groups, and Enter to start continuous practice', async () => {
  const user = renderSetup()
  const addition = screen.getByRole('checkbox', { name: 'Addition' })
  for (
    let index = 0;
    index < 10 && document.activeElement !== addition;
    index++
  )
    await user.tab()
  expect(addition).toHaveFocus()
  await user.keyboard(' ')
  expect(addition).toBeChecked()
  screen.getByRole('radio', { name: 'Level 1: Beginner' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('radio', { name: 'Level 2: Easy' })).toBeChecked()
  screen.getByRole('radio', { name: '10 questions' }).focus()
  await user.keyboard('{ArrowRight}{ArrowRight}')
  expect(
    screen.getByRole('radio', { name: 'Continuous practice' }),
  ).toBeChecked()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Start Session' })).toHaveFocus()
  await user.keyboard('{Enter}')
  const plan = screen.getByLabelText('Your selected practice configuration')
  expect(within(plan).getByText('Addition')).toBeVisible()
  expect(within(plan).getByText('Level 2: Easy')).toBeVisible()
  expect(within(plan).getByText('Continuous practice')).toBeVisible()
})
