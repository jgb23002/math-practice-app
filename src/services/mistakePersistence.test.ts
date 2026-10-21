import { expect, test } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import { createMistakePattern } from '../test/mistakeFixtures'
import { createAttempt, createCompletedSession } from '../test/sessionFixtures'
import { createStatisticsProgress } from '../test/statisticsFixtures'
import { emptyProgress, memoryStorage } from '../test/storageFixtures'
import {
  loadStoredProgress,
  saveStoredProgress,
  withSessionProgress,
} from './progressPersistence'

test('persists every pattern field, preserves settings/history, and updates a loaded pattern', () => {
  const progress = createStatisticsProgress()
  progress.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  progress.mistakePatterns = [
    createMistakePattern({
      incorrectCount: 4,
      similarCorrectCount: 3,
      mastered: true,
    }),
  ]
  const { storage, data } = memoryStorage()
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)).toEqual(
    progress.mistakePatterns,
  )
  const loaded = loadStoredProgress(storage)
  expect(loaded).toMatchObject({ progress, warning: null, writable: true })
  const next = withSessionProgress(
    loaded.progress,
    createCompletedSession([
      createAttempt({
        id: 'new-attempt',
        selfReportedCorrect: false,
        attemptedAt: '2026-10-21T12:01:00.000Z',
      }),
    ]),
  )
  expect(next.mistakePatterns).toEqual([
    {
      ...progress.mistakePatterns[0],
      incorrectCount: 5,
      similarCorrectCount: 0,
      mastered: false,
      lastIncorrectAt: '2026-10-21T12:01:00.000Z',
    },
  ])
  expect(saveStoredProgress(storage, next)).toBe(true)
  expect(loadStoredProgress(storage).progress).toEqual(next)
})

test('replaying snapshots, ending, resaving, and reloading cannot count attempts twice', () => {
  const firstAttempt = createAttempt({ selfReportedCorrect: false })
  const secondAttempt = createAttempt({
    id: 'attempt-two',
    questionId: 'question-two',
    selfReportedCorrect: false,
  })
  const first = createCompletedSession([firstAttempt])
  const final = createCompletedSession([firstAttempt, secondAttempt])
  let progress = withSessionProgress(emptyProgress(), first)
  const id = progress.mistakePatterns[0].id
  for (let index = 0; index < 10; index++)
    progress = withSessionProgress(progress, first)
  expect(progress.mistakePatterns).toEqual([
    expect.objectContaining({ id, incorrectCount: 1 }),
  ])
  progress = withSessionProgress(progress, final)
  const { storage } = memoryStorage()
  for (let index = 0; index < 3; index++) {
    expect(saveStoredProgress(storage, progress)).toBe(true)
    progress = withSessionProgress(loadStoredProgress(storage).progress, final)
  }
  expect(progress.mistakePatterns).toEqual([
    expect.objectContaining({ id, incorrectCount: 2 }),
  ])
  expect(progress.attempts).toHaveLength(2)
})

test('does not backfill or replay historical attempts when the additive pattern category is absent', () => {
  const progress = withSessionProgress(
    emptyProgress(),
    createCompletedSession([createAttempt({ selfReportedCorrect: false })]),
  )
  const { storage, data } = memoryStorage()
  saveStoredProgress(storage, progress)
  data.delete(STORAGE_KEYS.mistakePatterns)
  const loaded = loadStoredProgress(storage)
  expect(loaded.warning).toBeNull()
  expect(loaded.progress.mistakePatterns).toEqual([])
  expect(loaded.progress.attempts).toEqual(progress.attempts)
})

test.each(['{broken', 'null', '{}', '"mistake"'])(
  'invalid category %s recovers without affecting other data',
  (value) => {
    const progress = createStatisticsProgress()
    progress.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const { storage, data } = memoryStorage({ 'other.app': 'stay' })
    saveStoredProgress(storage, progress)
    data.set(STORAGE_KEYS.mistakePatterns, value)
    expect(loadStoredProgress(storage)).toMatchObject({
      progress,
      writable: true,
      warning: expect.stringMatching(/kept the parts we could/),
    })
    expect(data.get('other.app')).toBe('stay')
  },
)

test('loads valid records around malformed entries and repairs the category on save', () => {
  const first = createMistakePattern({ similarCorrectCount: 2 })
  const second = createMistakePattern({ id: 'other', difficulty: 2 })
  const { storage, data } = memoryStorage({
    [STORAGE_KEYS.mistakePatterns]: JSON.stringify([
      first,
      null,
      { ...first, incorrectCount: -1 },
      second,
    ]),
  })
  const loaded = loadStoredProgress(storage)
  expect(loaded.progress.mistakePatterns).toEqual([first, second])
  expect(loaded.warning).toMatch(/kept the parts we could/)
  expect(saveStoredProgress(storage, loaded.progress)).toBe(true)
  expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)).toEqual([
    first,
    second,
  ])
  expect(loadStoredProgress(storage).warning).toBeNull()
})

test('normalizes duplicate patterns on load and keeps that count stable on later loads', () => {
  const pattern = createMistakePattern({ incorrectCount: 4 })
  const duplicate = {
    ...pattern,
    id: 'duplicate',
    incorrectCount: 2,
    lastIncorrectAt: '2026-10-21T12:01:00.000Z',
  }
  const { storage } = memoryStorage({
    [STORAGE_KEYS.mistakePatterns]: JSON.stringify([
      pattern,
      pattern,
      duplicate,
    ]),
  })
  const loaded = loadStoredProgress(storage)
  expect(loaded.progress.mistakePatterns).toEqual([
    { ...duplicate, id: pattern.id, incorrectCount: 4 },
  ])
  expect(loaded.warning).not.toBeNull()
  expect(saveStoredProgress(storage, loaded.progress)).toBe(true)
  expect(loadStoredProgress(storage)).toMatchObject({
    progress: loaded.progress,
    warning: null,
  })
})

test('refuses invalid or duplicate in-memory patterns while saving unaffected categories', () => {
  const { storage, data } = memoryStorage()
  const original = emptyProgress()
  original.mistakePatterns = [createMistakePattern()]
  saveStoredProgress(storage, original)
  for (const invalid of [
    [{ ...createMistakePattern(), incorrectCount: 0 }],
    [createMistakePattern(), createMistakePattern({ id: 'duplicate' })],
  ]) {
    const progress = {
      ...original,
      mistakePatterns: invalid,
      settings: { ...original.settings, animationsEnabled: false },
    }
    expect(saveStoredProgress(storage, progress)).toBe(false)
    expect(JSON.parse(data.get(STORAGE_KEYS.mistakePatterns)!)).toEqual(
      original.mistakePatterns,
    )
    expect(JSON.parse(data.get(STORAGE_KEYS.settings)!).animationsEnabled).toBe(
      false,
    )
  }
})

test('pattern write failure preserves memory and unrelated categories; retry saves the same single record', () => {
  const { storage, access, data } = memoryStorage()
  const progress = withSessionProgress(
    emptyProgress(),
    createCompletedSession([createAttempt({ selfReportedCorrect: false })]),
  )
  const write = access.setItem.getMockImplementation()!
  access.setItem.mockImplementation((key, value) => {
    if (key === STORAGE_KEYS.mistakePatterns)
      throw new DOMException('Full', 'QuotaExceededError')
    write(key, value)
  })
  expect(saveStoredProgress(storage, progress)).toBe(false)
  expect(data.has(STORAGE_KEYS.mistakePatterns)).toBe(false)
  expect(JSON.parse(data.get(STORAGE_KEYS.attempts)!)).toHaveLength(1)
  expect(progress.mistakePatterns[0].incorrectCount).toBe(1)
  access.setItem.mockImplementation(write)
  expect(saveStoredProgress(storage, progress)).toBe(true)
  expect(loadStoredProgress(storage).progress).toEqual(progress)
})
