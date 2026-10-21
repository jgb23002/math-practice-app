import Header from '../components/layout/Header'
import StorageWarning from '../components/common/StorageWarning'
import PageContainer from '../components/layout/PageContainer'
import AppRoutes from './AppRoutes'
import AppProvider from './AppProvider'
import SessionNavigationSafety from '../components/practice/SessionNavigationSafety'
import SessionRecoveryNotice from '../components/practice/SessionRecoveryNotice'
import './App.css'
import { useLocation } from 'react-router'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ErrorMessage from '../components/common/ErrorMessage'
import { useApplicationStatus } from './ApplicationStatusContext'

function AppContent() {
  const { pathname } = useLocation()
  const { actionError } = useApplicationStatus()
  return (
    <PageContainer>
      {actionError && (
        <ErrorMessage title="Let’s try that again" message={actionError} />
      )}
      <ErrorBoundary key={pathname} page>
        <AppRoutes />
      </ErrorBoundary>
    </PageContainer>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <SessionNavigationSafety>
          <div className="app-shell">
            <a className="skip-link" href="#main-content">
              Skip to main content
            </a>
            <Header />
            <StorageWarning />
            <SessionRecoveryNotice />
            <AppContent />
            <footer className="app-footer">
              <p>A little practice. A lot of possibility.</p>
              <p>For curious minds, ages 7–12</p>
              <p>
                Progress stays in this browser. Clearing browser data may erase
                it.
              </p>
            </footer>
          </div>
        </SessionNavigationSafety>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
