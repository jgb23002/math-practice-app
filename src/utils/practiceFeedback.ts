import { randomInt, type RandomSource } from './math'
import { reportDevelopmentError } from './developmentErrors'

export const welcomeFeedback =
  'Take your time. Every little try helps you grow.'

const positiveMessages = [
  'Nice work! Keep being curious.',
  'You checked your work. Great effort!',
  'One more little step. Well done!',
] as const

const supportiveMessages = [
  'Tricky facts take practice. You can try again!',
  'Every try helps you learn. Keep going!',
  'Take a breath. One small step at a time.',
] as const

/** Only a recorded self-report determines which kind of feedback is shown. */
export function practiceFeedback(
  selfReportedCorrect: boolean | null,
  random: RandomSource = Math.random,
): string {
  if (selfReportedCorrect === null) return welcomeFeedback
  const messages = selfReportedCorrect ? positiveMessages : supportiveMessages
  try {
    return messages[randomInt(0, messages.length - 1, random)]
  } catch (error) {
    reportDevelopmentError(
      'Encouragement randomization failed; using a fixed message',
      error,
    )
    return messages[0]
  }
}
