export type StorageFailure = 'invalid' | 'unavailable' | 'full'
export type ReadResult<T> =
  | { status: 'valid'; value: T }
  | { status: 'missing' }
  | { status: StorageFailure }
export type WriteResult = { ok: true } | { ok: false; reason: StorageFailure }

export interface StorageAccess {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

/** Resolve storage inside each guarded operation: even accessing it can throw. */
export function createJsonStorage(
  access: () => StorageAccess = () => window.localStorage,
) {
  return {
    read<T>(
      key: string,
      validate: (value: unknown) => value is T,
    ): ReadResult<T> {
      let raw: string | null
      try {
        raw = access().getItem(key)
      } catch {
        return { status: 'unavailable' }
      }
      if (raw === null) return { status: 'missing' }
      try {
        const value: unknown = JSON.parse(raw)
        return validate(value)
          ? { status: 'valid', value }
          : { status: 'invalid' }
      } catch {
        return { status: 'invalid' }
      }
    },
    write(key: string, value: unknown): WriteResult {
      let serialized: string | undefined
      try {
        serialized = JSON.stringify(value)
        if (serialized === undefined) return { ok: false, reason: 'invalid' }
      } catch {
        return { ok: false, reason: 'invalid' }
      }
      try {
        const storage = access()
        // Idempotent writes also avoid duplicate effects in React Strict Mode.
        if (storage.getItem(key) !== serialized)
          storage.setItem(key, serialized)
        return { ok: true }
      } catch (error) {
        const full =
          error instanceof DOMException &&
          (error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        return { ok: false, reason: full ? 'full' : 'unavailable' }
      }
    },
  }
}

export type JsonStorage = ReturnType<typeof createJsonStorage>
