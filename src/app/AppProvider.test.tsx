import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import AppProvider from './AppProvider'

test('stores an independent validated snapshot and rejects invalid replacements', () => {
  const { result } = renderHook(usePracticeConfiguration, {
    wrapper: AppProvider,
  })
  const candidate = {
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 10,
  }
  expect(result.current.configuration).toBeNull()
  act(() => {
    expect(result.current.configureSession(candidate)).toBe(true)
  })
  candidate.operations.push('division')
  expect(result.current.configuration?.operations).toEqual(['addition'])
  act(() => {
    expect(
      result.current.configureSession({ ...candidate, operations: [] }),
    ).toBe(false)
  })
  expect(result.current.configuration).toEqual({
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 10,
  })
})
