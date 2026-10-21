import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from '../app/App'
import { STORAGE_KEYS } from '../config/storage'
import { saveStoredProgress } from '../services/progressPersistence'
import { createJsonStorage } from '../services/storage'
import { createMistakePattern } from '../test/mistakeFixtures'
import { emptyProgress } from '../test/storageFixtures'
import type { StoredProgress } from '../types/persistence'

function renderSetup(progress = emptyProgress(), state?: { mode: string }) {
  expect(saveStoredProgress(createJsonStorage(), progress)).toBe(true)
  const view = render(
    <MemoryRouter initialEntries={[{ pathname: '/practice/setup', state }]}>
      <App />
    </MemoryRouter>,
  )
  return { ...view, user: userEvent.setup() }
}
function reviewProgress() {
  const progress = emptyProgress()
  progress.settings.defaultOperations = ['addition']
  progress.mistakePatterns = [createMistakePattern()]
  return progress
}
const patterns = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!)

test.each([false, true])(
  'review is disabled and explained with zero active patterns (has mastered records: %s)',
  (mastered) => {
    const progress = emptyProgress()
    if (mastered)
      progress.mistakePatterns = [
        createMistakePattern({ mastered: true, similarCorrectCount: 3 }),
      ]
    renderSetup(progress, { mode: 'mistake-review' })
    const review = screen.getByRole('radio', { name: 'Mistake Review' })
    expect(review).toBeDisabled()
    expect(review).toHaveAccessibleDescription(
      mastered ? /mastered your saved patterns/ : /I Got It Wrong/,
    )
    expect(screen.getByText(/0 active mistake patterns/)).toBeVisible()
    expect(
      screen.getByRole('radio', { name: 'Regular Practice' }),
    ).toBeChecked()
  },
)

test('review mode supports keyboard selection and blocks plans without matching operations or difficulty', async () => {
  const progress = reviewProgress()
  progress.mistakePatterns.push(
    createMistakePattern({ id: 'higher', difficulty: 2 }),
  )
  const { user } = renderSetup(progress)
  expect(screen.getByText(/2 active mistake patterns are ready/)).toBeVisible()
  screen.getByRole('radio', { name: 'Regular Practice' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('radio', { name: 'Mistake Review' })).toBeChecked()
  expect(
    screen.getByText(/1 active pattern matches your choices/),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
  await user.click(screen.getByRole('radio', { name: 'Level 4: Advanced' }))
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    /No active patterns match/,
  )
  fireEvent.submit(screen.getByRole('form'))
  expect(
    screen.getByRole('heading', { name: 'Your next math adventure' }),
  ).toBeVisible()
  await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('checkbox', { name: 'Division' }))
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
  await user.click(screen.getByRole('radio', { name: 'Regular Practice' }))
  expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
})

async function reportWrongChoiceAsRight(
  user: ReturnType<typeof userEvent.setup>,
) {
  const equation = screen.getByRole('heading', {
    name: /\+.*= \?/,
  }).textContent!
  const [first, second] = equation.match(/\d+/g)!.map(Number)
  const choices = within(
    screen.getByRole('group', { name: 'Choose one answer' }),
  ).getAllByRole('button')
  const wrong = choices.find(
    (button) =>
      button.getAttribute('aria-label') !== `Answer ${first + second}`,
  )!
  await user.click(wrong)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
}

test('real review cards preserve self-report semantics, reach mastery, finish early, and persist across remounts', async () => {
  const { user, unmount } = renderSetup(reviewProgress())
  await user.click(screen.getByRole('radio', { name: 'Mistake Review' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  expect(
    screen.getByLabelText('Your selected practice configuration'),
  ).toHaveTextContent('Mistake Review')
  expect(patterns()[0].similarCorrectCount).toBe(0)
  for (let count = 1; count <= 3; count++) {
    await reportWrongChoiceAsRight(user)
    expect(patterns()[0]).toMatchObject({
      similarCorrectCount: count,
      mastered: count === 3,
    })
  }
  expect(
    screen.getByRole('heading', { name: 'A place to celebrate' }),
  ).toBeVisible()
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '100%',
  )
  expect(
    screen.getByText('Mistake-review questions completed').nextElementSibling,
  ).toHaveTextContent('3')
  expect(screen.getByRole('status')).toHaveTextContent(
    /mastered all the review patterns/,
  )
  const attempts = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)
  expect(attempts).toHaveLength(3)
  expect(
    attempts.every(
      (attempt: {
        selectedAnswer: number
        correctAnswer: number
        mistakePatternId: string
      }) =>
        attempt.selectedAnswer !== attempt.correctAnswer &&
        attempt.mistakePatternId === 'mistake-one',
    ),
  ).toBe(true)
  expect(
    screen.getByRole('button', { name: 'Practice Mistakes' }),
  ).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Practice Again' }))
  expect(screen.getByRole('radio', { name: 'Regular Practice' })).toBeChecked()
  unmount()
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
    </MemoryRouter>,
  )
  expect(patterns()[0]).toMatchObject({
    mastered: true,
    similarCorrectCount: 3,
  })
  expect(screen.getByRole('radio', { name: 'Mistake Review' })).toBeDisabled()
})

test('Practice Mistakes opens review setup with an eligible plan and retains review mode when editing', async () => {
  const progress: StoredProgress = reviewProgress()
  progress.mistakePatterns[0].difficulty = 2
  const { user } = renderSetup(progress)
  await user.click(screen.getByRole('radio', { name: 'Continuous practice' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  await user.click(screen.getByRole('button', { name: 'Practice Mistakes' }))
  expect(screen.getByRole('radio', { name: 'Mistake Review' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 2: Easy' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  await user.click(screen.getByRole('link', { name: 'Explore Practice' }))
  expect(screen.getByRole('radio', { name: 'Mistake Review' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Level 2: Easy' })).toBeChecked()
})

test('fixed review sessions honor the chosen length and Practice Again repeats review while active patterns remain', async () => {
  const progress = reviewProgress()
  progress.settings.masteryThreshold = 10
  const { user } = renderSetup(progress)
  await user.click(screen.getByRole('radio', { name: 'Mistake Review' }))
  await user.click(screen.getByRole('radio', { name: '5 questions' }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  for (let index = 0; index < 5; index++) await reportWrongChoiceAsRight(user)
  expect(
    screen.getByText('Mistake-review questions completed').nextElementSibling,
  ).toHaveTextContent('5')
  expect(patterns()[0]).toMatchObject({
    similarCorrectCount: 5,
    mastered: false,
  })
  await user.click(screen.getByRole('button', { name: 'Practice Again' }))
  expect(screen.getByText('Question 1 of 5')).toBeVisible()
  expect(
    screen.getByLabelText('Your selected practice configuration'),
  ).toHaveTextContent('Mistake Review')
  expect(patterns()[0].similarCorrectCount).toBe(5)
})
