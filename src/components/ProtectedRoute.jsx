import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../utils/auth';

export default function ProtectedRoute() {
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

