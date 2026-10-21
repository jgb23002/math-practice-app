import Header from '../components/layout/Header'
import StorageWarning from '../components/common/StorageWarning'
import PageContainer from '../components/layout/PageContainer'
import AppRoutes from './AppRoutes'
import AppProvider from './AppProvider'
import SessionNavigationSafety from '../components/practice/SessionNavigationSafety'
import SessionRecoveryNotice from '../components/practice/SessionRecoveryNotice'
import './App.css'

function App() {
  return (
    <AppProvider>
      <SessionNavigationSafety>
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <Header />
          <StorageWarning />
          <SessionRecoveryNotice />
          <PageContainer>
            <AppRoutes />
          </PageContainer>
          <footer className="app-footer">
            <p>A little practice. A lot of possibility.</p>
            <p>For curious minds, ages 7–12</p>
          </footer>
        </div>
      </SessionNavigationSafety>
    </AppProvider>
  )
}

export default App
