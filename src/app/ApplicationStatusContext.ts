import { createContext, useContext } from 'react'

export const ApplicationStatusContext = createContext({
  storageWarning: null as string | null,
  actionError: null as string | null,
})

export function useApplicationStatus() {
  return useContext(ApplicationStatusContext)
}
