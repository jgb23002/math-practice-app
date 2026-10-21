import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

// Every test begins with a new browser's storage. Persistence tests remount the
// app within the same test to verify that real stored data survives.
beforeEach(() => localStorage.clear())

afterEach(() => {
  cleanup()
})
