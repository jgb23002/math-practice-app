import { createContext } from 'react'

/** Hold the card route's completion redirect while a confirmed exit proceeds. */
const SessionExitContext = createContext(false)
export default SessionExitContext
