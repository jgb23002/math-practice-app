import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const preference = window.matchMedia(query)
  preference.addEventListener('change', onChange)
  return () => preference.removeEventListener('change', onChange)
}

function getSnapshot() {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  )
}

function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

export default useReducedMotion
