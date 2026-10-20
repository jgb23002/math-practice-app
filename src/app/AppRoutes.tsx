import { Route, Routes } from 'react-router'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import PracticePage from '../pages/PracticePage'
import PracticeSetupPage from '../pages/PracticeSetupPage'
import SessionSummaryPage from '../pages/SessionSummaryPage'
import SettingsPage from '../pages/SettingsPage'
import StatisticsPage from '../pages/StatisticsPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/practice/setup" element={<PracticeSetupPage />} />
      <Route path="/practice/session" element={<PracticePage />} />
      <Route path="/practice/summary" element={<SessionSummaryPage />} />
      <Route path="/statistics" element={<StatisticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
