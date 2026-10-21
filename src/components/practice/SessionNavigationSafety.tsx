import { useEffect, useRef, type PropsWithChildren } from 'react'
import { useBlocker } from 'react-router'
import SessionExitContext from '../../app/SessionExitContext'
import usePracticeConfiguration from '../../hooks/usePracticeConfiguration'
import ConfirmationDialog from '../common/ConfirmationDialog'

function SessionNavigationSafety({ children }: PropsWithChildren) {
  const { session, getActiveSession, saveCurrentSession, dispatchSession } =
    usePracticeConfiguration()
  const acting = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!getActiveSession() &&
      currentLocation.pathname === '/practice/session' &&
      nextLocation.pathname !== currentLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') acting.current = false
    else if (!session?.isActive && !acting.current) {
      acting.current = true
      blocker.proceed()
    }
  }, [blocker, session?.isActive])

  useEffect(() => {
    if (!session?.isActive) return
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!getActiveSession()) return
      saveCurrentSession()
      event.preventDefault()
      event.returnValue = ''
    }
    function save() {
      if (getActiveSession()) saveCurrentSession()
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') save()
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [session?.isActive, getActiveSession, saveCurrentSession])

  function choose(action: 'stay' | 'pause' | 'end') {
    if (acting.current || blocker.state !== 'blocked') return
    acting.current = true
    if (action === 'stay') {
      blocker.reset()
      return
    }
    const active = getActiveSession()
    if (action === 'end' && active)
      dispatchSession({ type: 'end', sessionId: active.id })
    else saveCurrentSession()
    blocker.proceed()
  }
  return (
    <SessionExitContext.Provider value={blocker.state !== 'unblocked'}>
      {children}
      {blocker.state === 'blocked' && (
        <ConfirmationDialog
          title="Leave your practice?"
          description="You can keep practicing, leave your card ready for later, or end this session. Only answers you’ve marked count."
          onCancel={() => choose('stay')}
        >
          <button
            type="button"
            className="button button--primary"
            onClick={() => choose('stay')}
          >
            Keep Practicing
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => choose('pause')}
          >
            Leave for Now
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => choose('end')}
          >
            End Session and Leave
          </button>
        </ConfirmationDialog>
      )}
    </SessionExitContext.Provider>
  )
}

export default SessionNavigationSafety
