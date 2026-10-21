import { Component, type ErrorInfo, type PropsWithChildren } from 'react'
import { reportDevelopmentError } from '../../utils/developmentErrors'
import ErrorMessage from './ErrorMessage'

type ErrorBoundaryProps = PropsWithChildren<{ page?: boolean }>

class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportDevelopmentError('A screen could not be displayed', {
      error,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (!this.state.failed) return this.props.children
    const notice = (
      <ErrorMessage
        title="Let’s find our way back"
        message="This page got a little mixed up. You can try again or return home. We haven’t cleared your saved progress."
        headingLevel={1}
        reloadHome={!this.props.page}
        onRetry={() => this.setState({ failed: false })}
      />
    )
    return this.props.page ? (
      notice
    ) : (
      <main
        className="error-fallback"
        id="main-content"
        aria-labelledby="page-heading"
      >
        {notice}
      </main>
    )
  }
}

export default ErrorBoundary
