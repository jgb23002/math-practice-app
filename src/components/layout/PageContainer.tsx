import { useEffect, useRef, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router'

function PageContainer({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <main
      ref={mainRef}
      id="main-content"
      className="page-container"
      tabIndex={-1}
      aria-labelledby="page-heading"
    >
      {children}
    </main>
  )
}

export default PageContainer
