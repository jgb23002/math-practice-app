import Header from '../components/layout/Header'
import PageContainer from '../components/layout/PageContainer'
import AppRoutes from './AppRoutes'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <PageContainer>
        <AppRoutes />
      </PageContainer>
      <footer className="app-footer">
        <p>A little practice. A lot of possibility.</p>
        <p>For curious minds, ages 7–12</p>
      </footer>
    </div>
  )
}

export default App
