import { expect, test } from 'vitest'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createAttempt, createCompletedSession } from '../test/sessionFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import {
  isPracticeAttempt,
  isPracticeSession,
} from '../utils/storageValidation'
import { recordMistakes } from './mistakeTracking'
import {
  loadStoredProgress,
  saveStoredProgress,
  withSessionProgress,
} from './progressPersistence'

function review(correct = true) {
  return createAttempt({
    source: 'mistake-review',
    mistakePatternId: 'mistake-one',
    firstOperand: 4,
    secondOperand: 3,
    selectedAnswer: correct ? 6 : 7,
    selfReportedCorrect: correct,
  })
}

test('three self-reported correct reviews master the original pattern without altering miss history', () => {
  const original = Object.freeze(createMistakePattern({ incorrectCount: 5 }))
  let patterns = [original]
  for (let count = 1; count <= 3; count++) {
    patterns = recordMistakes(patterns, [review()])
    expect(patterns).toEqual([
      { ...original, similarCorrectCount: count, mastered: count === 3 },
    ])
  }
  expect(original.similarCorrectCount).toBe(0)
})

test.each([1, 2, 5])(
  'honors configured mastery threshold %i using self-reports despite a wrong selected answer',
  (threshold) => {
    let patterns = [createMistakePattern()]
    for (let index = 0; index < threshold; index++)
      patterns = recordMistakes(patterns, [review()], threshold)
    expect(patterns[0]).toMatchObject({
      mastered: true,
      similarCorrectCount: threshold,
    })
  },
)

test('an incorrect review resets and updates only the attributed original, even if its answer was selected correctly', () => {
  const original = createMistakePattern({
    mastered: true,
    similarCorrectCount: 3,
    incorrectCount: 5,
  })
  const relatedFact = createMistakePattern({
    id: 'other',
    firstOperand: 4,
    secondOperand: 3,
  })
  const attempt = { ...review(false), attemptedAt: '2026-10-21T12:01:00.000Z' }
  expect(recordMistakes([original, relatedFact], [attempt])).toEqual([
    {
      ...original,
      incorrectCount: 6,
      lastIncorrectAt: attempt.attemptedAt,
      similarCorrectCount: 0,
      mastered: false,
    },
    relatedFact,
  ])
})

test('later regular mistakes reactivate a mastered pattern with the same ID', () => {
  const original = createMistakePattern({
    mastered: true,
    similarCorrectCount: 3,
  })
  expect(
    recordMistakes([original], [createAttempt({ selfReportedCorrect: false })]),
  ).toEqual([
    { ...original, mastered: false, similarCorrectCount: 0, incorrectCount: 2 },
  ])
})

test('unattributed legacy or orphan review attempts never guess an original or create another pattern', () => {
  const original = createMistakePattern()
  for (const mistakePatternId of [undefined, 'missing-pattern']) {
    for (const correct of [true, false])
      expect(
        recordMistakes([original], [{ ...review(correct), mistakePatternId }]),
      ).toEqual([original])
  }
})

test('review attribution and mode serialize and reload without replaying mastery', () => {
  let progress = emptyProgress()
  progress.mistakePatterns = [createMistakePattern()]
  progress.settings.masteryThreshold = 2
  const attempts = [
    review(),
    { ...review(), id: 'second', questionId: 'second' },
  ]
  const session = createCompletedSession(attempts, { mode: 'mistake-review' })
  progress = withSessionProgress(progress, session)
  expect(progress.mistakePatterns[0]).toMatchObject({
    similarCorrectCount: 2,
    mastered: true,
  })
  const { storage } = memoryStorage()
  expect(saveStoredProgress(storage, progress)).toBe(true)
  for (let index = 0; index < 3; index++) {
    progress = withSessionProgress(
      loadStoredProgress(storage).progress,
      session,
    )
    expect(saveStoredProgress(storage, progress)).toBe(true)
  }
  expect(progress.mistakePatterns[0].similarCorrectCount).toBe(2)
  expect(progress.attempts).toEqual(attempts)
  expect(progress.sessions[0].mode).toBe('mistake-review')
})

test('validates optional new fields while accepting legacy stored sessions and attempts', () => {
  expect(isPracticeAttempt(review())).toBe(true)
  expect(isPracticeAttempt({ ...review(), mistakePatternId: undefined })).toBe(
    true,
  )
  for (const mistakePatternId of ['', null, 123])
    expect(isPracticeAttempt({ ...review(), mistakePatternId })).toBe(false)
  expect(isPracticeAttempt({ ...review(), source: 'regular' })).toBe(false)
  expect(
    isPracticeSession(createCompletedSession([], { mode: 'mistake-review' })),
  ).toBe(true)
  expect(
    isPracticeSession({ ...createCompletedSession(), mode: 'unknown' }),
  ).toBe(false)
})

test.each([0, -1, 1.5, Infinity])(
  'rejects invalid mastery threshold %s',
  (threshold) => {
    expect(() => recordMistakes([], [], threshold)).toThrow(RangeError)
  },
)
