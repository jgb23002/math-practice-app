import { useState, type PropsWithChildren } from 'react'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import { isValidPracticeConfiguration } from '../utils/practiceConfiguration'
import PracticeSessionContext from './PracticeSessionContext'

function AppProvider({ children }: PropsWithChildren) {
  const [configuration, setConfiguration] =
    useState<PracticeConfiguration | null>(null)

  function configureSession(candidate: unknown) {
    if (!isValidPracticeConfiguration(candidate)) return false

    setConfiguration({
      operations: [...candidate.operations],
      difficulty: candidate.difficulty,
      sessionLength: candidate.sessionLength,
    })
    return true
  }

  return (
    <PracticeSessionContext.Provider
      value={{ configuration, configureSession }}
    >
      {children}
    </PracticeSessionContext.Provider>
  )
}

export default AppProvider
