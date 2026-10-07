import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LoginPage from './pages/Login'
import Dashboard from './components/Dashboard'
import Preclaim from './components/Preclaim'
import Windsheild from './components/Windsheild'
import MotorClaim from './components/MotorClaim'
import ProtectedRoute from './components/ProtectedRoute'
import ResultsPage from './pages/ResultsPage'
import './App.css'

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language?.startsWith('ar') ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language || 'en';
  }, [i18n.language]);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/preclaim/:user_id/:unique_id" element={<Preclaim />} />
        <Route path="/windsheild/:user_id/:unique_id" element={<Windsheild />} />
        <Route path="/motorclaim/:user_id/:unique_id" element={<MotorClaim />} />
        <Route path="/results/:id" element={<ResultsPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App