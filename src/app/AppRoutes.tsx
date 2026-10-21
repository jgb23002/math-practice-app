import { Route, Routes } from 'react-router'
import LazyPage from '../components/common/LazyPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import PracticePage from '../pages/PracticePage'
import PracticeSetupPage from '../pages/PracticeSetupPage'
import SessionSummaryPage from '../pages/SessionSummaryPage'
const loadSettings = () => import('../pages/SettingsPage')
const loadStatistics = () => import('../pages/StatisticsPage')

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/practice/setup" element={<PracticeSetupPage />} />
      <Route path="/practice/session" element={<PracticePage />} />
      <Route path="/practice/summary" element={<SessionSummaryPage />} />
      <Route
        path="/statistics"
        element={<LazyPage key="statistics" load={loadStatistics} />}
      />
      <Route
        path="/settings"
        element={<LazyPage key="settings" load={loadSettings} />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
