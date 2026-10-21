import { expect, test, vi } from 'vitest'
import { memoryStorage } from '../test/storageFixtures'
import { createJsonStorage } from './storage'

const isString = (value: unknown): value is string => typeof value === 'string'

test('serializes JSON and returns independently parsed data', () => {
  const { storage, data } = memoryStorage()
  const value = {
    selectedAnswer: 0,
    selfReportedCorrect: false,
    label: '✦ 数学',
  }
  expect(storage.write('test', value)).toEqual({ ok: true })
  expect(data.get('test')).toBe(JSON.stringify(value))
  const result = storage.read(
    'test',
    (item): item is typeof value =>
      typeof item === 'object' && item !== null && 'selectedAnswer' in item,
  )
  expect(result).toEqual({ status: 'valid', value })
  if (result.status === 'valid') {
    result.value.selectedAnswer = 10
    expect(value.selectedAnswer).toBe(0)
    expect(JSON.parse(data.get('test')!).selectedAnswer).toBe(0)
  }
})

test('distinguishes missing data, malformed JSON, and invalid shapes', () => {
  const { storage } = memoryStorage({ broken: '{', wrong: '42', null: 'null' })
  expect(storage.read('absent', isString)).toEqual({ status: 'missing' })
  for (const key of ['broken', 'wrong', 'null'])
    expect(storage.read(key, isString)).toEqual({ status: 'invalid' })
  expect(
    storage.read('wrong', (value): value is string => {
      void value
      throw new Error('validator')
    }),
  ).toEqual({ status: 'invalid' })
})

test('does not repeat unchanged writes', () => {
  const { storage, access } = memoryStorage()
  storage.write('test', { value: 1 })
  storage.write('test', { value: 1 })
  expect(access.setItem).toHaveBeenCalledTimes(1)
})

test('handles storage access and reading exceptions', () => {
  const unavailable = createJsonStorage(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  expect(unavailable.read('test', isString)).toEqual({ status: 'unavailable' })
  expect(unavailable.write('test', 'value')).toEqual({
    ok: false,
    reason: 'unavailable',
  })
  const access = {
    getItem: vi.fn(() => {
      throw new Error('read')
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }
  expect(createJsonStorage(() => access).read('test', isString)).toEqual({
    status: 'unavailable',
  })
})

test.each([
  'QuotaExceededError',
  'NS_ERROR_DOM_QUOTA_REACHED',
  'SecurityError',
])('handles %s without throwing', (name) => {
  const { access, storage, data } = memoryStorage({ test: '"old"' })
  access.setItem.mockImplementation(() => {
    throw new DOMException('Failed', name)
  })
  expect(storage.write('test', 'new')).toEqual({
    ok: false,
    reason: name === 'SecurityError' ? 'unavailable' : 'full',
  })
  expect(data.get('test')).toBe('"old"')
})

test.each([
  undefined,
  1n,
  (() => {
    const value: unknown[] = []
    value.push(value)
    return value
  })(),
])('handles an unserializable value %#', (value) => {
  const { storage, access } = memoryStorage()
  expect(storage.write('test', value)).toEqual({ ok: false, reason: 'invalid' })
  expect(access.setItem).not.toHaveBeenCalled()
})
