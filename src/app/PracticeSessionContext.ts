import { createContext } from 'react'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

interface PracticeSessionContextValue {
  configuration: PracticeConfiguration | null
  configureSession: (candidate: unknown) => boolean
}

const PracticeSessionContext = createContext<
  PracticeSessionContextValue | undefined
>(undefined)

export default PracticeSessionContext
