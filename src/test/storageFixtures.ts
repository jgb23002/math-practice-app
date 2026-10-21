import { vi } from 'vitest'
import { createDefaultSettings } from '../config/storage'
import { createEmptyStatistics } from '../services/progressPersistence'
import { createJsonStorage } from '../services/storage'
import type { StoredProgress } from '../types/persistence'

export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const access = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key)
    }),
  }
  return { data, access, storage: createJsonStorage(() => access) }
}

export function emptyProgress(): StoredProgress {
  return {
    settings: createDefaultSettings(),
    sessions: [],
    attempts: [],
    statistics: createEmptyStatistics(),
  }
}
