import { expect, test, vi } from 'vitest'
import { practiceFeedback, welcomeFeedback } from './practiceFeedback'

test('welcomes a student without drawing a result or choosing randomly', () => {
  const random = vi.fn()
  expect(practiceFeedback(null, random)).toBe(welcomeFeedback)
  expect(random).not.toHaveBeenCalled()
})

test.each([true, false])(
  'varies encouragement for a self-report of %s using bounded choices',
  (correct) => {
    const messages = [0, 0.4, 0.999999].map((value) =>
      practiceFeedback(correct, () => value),
    )
    expect(new Set(messages).size).toBe(3)
    expect(messages.every((message) => message.length > 0)).toBe(true)
    expect(messages).toEqual(
      correct
        ? [
            'Nice work! Keep being curious.',
            'You checked your work. Great effort!',
            'One more little step. Well done!',
          ]
        : [
            'Tricky facts take practice. You can try again!',
            'Every try helps you learn. Keep going!',
            'Take a breath. One small step at a time.',
          ],
    )
  },
)
