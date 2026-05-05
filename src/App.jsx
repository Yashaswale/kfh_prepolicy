import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import Dashboard from './components/Dashboard'
import Preclaim from './components/Preclaim'
import Windsheild from './components/Windsheild'
import MotorClaim from './components/MotorClaim'
import PreclaimManual from './components/manual-upload/PreclaimManual'
import MotorClaimManual from './components/manual-upload/MotorClaimManual'
import WindshieldClaimManual from './components/manual-upload/WindshieldClaimManual'
import ProtectedRoute from './components/ProtectedRoute'
import ResultsPage from './pages/ResultsPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/preclaim/:user_id/:unique_id" element={<Preclaim />} />
        <Route path="/windsheild/:user_id/:unique_id" element={<Windsheild />} />
        <Route path="/motorclaim/:user_id/:unique_id" element={<MotorClaim />} />

        {/* Manual upload routes (independent from camera flow) */}
        <Route path="/manual/preclaim" element={<PreclaimManual />} />
        <Route path="/manual/preclaim/:user_id/:unique_id" element={<PreclaimManual />} />
        <Route path="/manual/motorclaim" element={<MotorClaimManual />} />
        <Route path="/manual/motorclaim/:user_id/:unique_id" element={<MotorClaimManual />} />
        <Route path="/manual/windsheild" element={<WindshieldClaimManual />} />
        <Route path="/manual/windsheild/:user_id/:unique_id" element={<WindshieldClaimManual />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/results/:id" element={<ResultsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App