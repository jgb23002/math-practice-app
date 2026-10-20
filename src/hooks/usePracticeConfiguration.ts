import { useContext } from 'react'
import PracticeSessionContext from '../app/PracticeSessionContext'

function usePracticeConfiguration() {
  const context = useContext(PracticeSessionContext)
  if (!context)
    throw new Error('usePracticeConfiguration must be used inside AppProvider.')
  return context
}

export default usePracticeConfiguration
