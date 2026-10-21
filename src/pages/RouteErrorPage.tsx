import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import ErrorMessage from '../components/common/ErrorMessage'
import usePageTitle from '../hooks/usePageTitle'
import { reportDevelopmentError } from '../utils/developmentErrors'

/** Replace the router's default developer error screen, including in production. */
function RouteErrorPage() {
  const error = useRouteError()
  usePageTitle('Let’s find our way back')
  useEffect(() => {
    reportDevelopmentError('Navigation could not finish', error)
  }, [error])
  return (
    <main
      className="error-fallback"
      id="main-content"
      aria-labelledby="page-heading"
    >
      <ErrorMessage
        title="Let’s find our way back"
        message="We couldn’t open that page. Let’s head home and choose a new adventure. Your saved progress hasn’t been cleared."
        headingLevel={1}
        reloadHome
      />
    </main>
  )
}

export default RouteErrorPage
