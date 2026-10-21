import Header from '../components/layout/Header'
import StorageWarning from '../components/common/StorageWarning'
import PageContainer from '../components/layout/PageContainer'
import AppRoutes from './AppRoutes'
import AppProvider from './AppProvider'
import './App.css'

function App() {
  return (
    <AppProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Header />
        <StorageWarning />
        <PageContainer>
          <AppRoutes />
        </PageContainer>
        <footer className="app-footer">
          <p>A little practice. A lot of possibility.</p>
          <p>For curious minds, ages 7–12</p>
        </footer>
      </div>
    </AppProvider>
  )
}

export default App
