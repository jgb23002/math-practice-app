import { useEffect, useRef } from 'react'
import { useInRouterContext } from 'react-router'
import ButtonLink from './ButtonLink'
import './ErrorMessage.css'

interface ErrorMessageProps {
  title: string
  message: string
  onRetry?: () => void
  headingLevel?: 1 | 2
  reloadHome?: boolean
}

/** Callers supply friendly copy, never exception messages or stored error text. */
function ErrorMessage({
  title,
  message,
  onRetry,
  headingLevel = 2,
  reloadHome = false,
}: ErrorMessageProps) {
  const inRouter = useInRouterContext()
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (headingLevel === 1) {
      document.title = `${title} | Math Practice`
      heading.current?.focus()
    }
  }, [headingLevel, title])
  return (
    <section className="error-message" role="alert">
      <Heading
        ref={heading}
        tabIndex={headingLevel === 1 ? -1 : undefined}
        id={headingLevel === 1 ? 'page-heading' : undefined}
      >
        {title}
      </Heading>
      <p>{message}</p>
      <div className="error-message__actions">
        {onRetry && (
          <button
            type="button"
            className="button button--primary"
            onClick={onRetry}
          >
            Try Again
          </button>
        )}
        {inRouter && !reloadHome ? (
          <ButtonLink to="/" variant="secondary">
            Return Home
          </ButtonLink>
        ) : (
          <a className="button button--secondary" href="/">
            Return Home
          </a>
        )}
      </div>
    </section>
  )
}

export default ErrorMessage
