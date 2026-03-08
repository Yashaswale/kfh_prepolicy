import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import Dashboard from './components/Dashboard'
import Preclaim from './components/Preclaim'
import Windsheild from './components/Windsheild'
import MotorClaim from './components/MotorClaim'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/preclaim/:user_id/:unique_id" element={<Preclaim />} />
        <Route path="/windsheild" element={<Windsheild />} />
        <Route path="/motorclaim" element={<MotorClaim />} />

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