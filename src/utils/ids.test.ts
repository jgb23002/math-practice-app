import { afterEach, expect, test, vi } from 'vitest'
import { createUniqueId } from './ids'

const uuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
afterEach(() => vi.unstubAllGlobals())

test('creates unique UUIDs across a large batch', () => {
  const ids = Array.from({ length: 2000 }, () => createUniqueId())
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids) expect(id).toMatch(uuidV4)
})

test('uses the native UUID implementation when available', () => {
  const randomUUID = vi.fn(() => 'a-native-uuid')
  vi.stubGlobal('crypto', { randomUUID })
  expect(createUniqueId()).toBe('a-native-uuid')
  expect(randomUUID).toHaveBeenCalledOnce()
})

test('builds an RFC v4 UUID with getRandomValues when randomUUID is unavailable', () => {
  const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(255))
  vi.stubGlobal('crypto', { getRandomValues })
  const id = createUniqueId()
  expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  expect(id).toMatch(uuidV4)
  expect(getRandomValues).toHaveBeenCalledOnce()
})

test('fails explicitly when secure randomness is unavailable', () => {
  vi.stubGlobal('crypto', undefined)
  expect(createUniqueId).toThrow(/unavailable/)
})
