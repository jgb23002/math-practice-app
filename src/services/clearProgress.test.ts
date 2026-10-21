import { expect, test } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import { createStatisticsProgress } from '../test/statisticsFixtures'
import { memoryStorage } from '../test/storageFixtures'
import {
  CLEAR_DATA_WARNING,
  clearStoredProgress,
  createDefaultProgress,
  createProgressPersistence,
  saveStoredProgress,
} from './progressPersistence'

test('explicit clear removes every known application key, including corrupt and newer-version data', () => {
  const values = Object.fromEntries(
    Object.values(STORAGE_KEYS).map((key) => [key, '{unreadable']),
  )
  const { storage, data, access } = memoryStorage({
    ...values,
    [STORAGE_KEYS.version]: '{"version":99}',
    'other.app': 'keep',
  })
  expect(clearStoredProgress(storage)).toBe(true)
  expect([...data.entries()]).toEqual([['other.app', 'keep']])
  expect(access.removeItem.mock.calls.map(([key]) => key).sort()).toEqual(
    Object.values(STORAGE_KEYS).sort(),
  )
})

test.each(Object.values(STORAGE_KEYS))(
  'a failed removal of %s does not refill cleared keys; a retry can finish',
  (failedKey) => {
    const { storage, data, access } = memoryStorage({
      'other.app': 'keep',
    })
    const old = createStatisticsProgress()
    expect(saveStoredProgress(storage, old)).toBe(true)
    const persistence = createProgressPersistence(storage)
    const remove = access.removeItem.getMockImplementation()!
    access.removeItem.mockImplementation((key) => {
      if (key === failedKey) throw new DOMException('Blocked', 'SecurityError')
      remove(key)
    })
    expect(persistence.clearAll()).toBe(false)
    expect(persistence.getWarning()).toBe(CLEAR_DATA_WARNING)
    expect(data.has(failedKey)).toBe(true)
    access.setItem.mockClear()
    expect(persistence.save(old)).toBe(false)
    expect(persistence.save(createDefaultProgress())).toBe(false)
    expect(access.setItem).not.toHaveBeenCalled()
    for (const key of Object.values(STORAGE_KEYS))
      if (key !== failedKey) expect(data.has(key)).toBe(false)
    access.removeItem.mockImplementation(remove)
    expect(persistence.clearAll()).toBe(true)
    expect(persistence.getWarning()).toBeNull()
    expect(persistence.save(createDefaultProgress())).toBe(true)
    expect(data.get('other.app')).toBe('keep')
    expect(data.get(STORAGE_KEYS.mistakePatterns)).toBe('[]')
    expect(JSON.parse(data.get(STORAGE_KEYS.settings)!)).toEqual(
      createDefaultProgress().settings,
    )
  },
)

test('successful clear replaces a newer schema and removes its read-only restriction', () => {
  const { storage, data } = memoryStorage({
    [STORAGE_KEYS.version]: '{"version":99}',
  })
  const persistence = createProgressPersistence(storage)
  expect(persistence.save(createDefaultProgress())).toBe(false)
  expect(persistence.clearAll()).toBe(true)
  expect(persistence.save(createDefaultProgress())).toBe(true)
  expect(data.get(STORAGE_KEYS.version)).toBe('{"version":1}')
})

test('clearing resets an old recovery warning and saves fresh defaults', () => {
  const { storage } = memoryStorage({ [STORAGE_KEYS.settings]: '{bad' })
  const persistence = createProgressPersistence(storage)
  expect(persistence.getWarning()).not.toBeNull()
  expect(persistence.clearAll()).toBe(true)
  persistence.save(createDefaultProgress())
  expect(persistence.getWarning()).toBeNull()
})

test('unavailable removal reports failure without touching other data', () => {
  const { storage, data, access } = memoryStorage({ 'other.app': 'keep' })
  access.removeItem.mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  expect(clearStoredProgress(storage)).toBe(false)
  expect(data.get('other.app')).toBe('keep')
})
