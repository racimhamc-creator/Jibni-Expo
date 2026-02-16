import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Drivers from './pages/Drivers';
import DriverRequests from './pages/DriverRequests';
import Missions from './pages/Missions';
import Reports from './pages/Reports';
import ServerStatus from './pages/ServerStatus';
import Login from './pages/Login';
import api from './services/api';
import './App.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = localStorage.getItem('admin_user');
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if user is authenticated (JWT is in httpOnly cookie)
    const user = localStorage.getItem('admin_user');
    setIsAuthenticated(!!user);
  }, []);

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear cookie
      await api.post('/auth/admin-logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Clear local storage
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    // Redirect to login
    window.location.href = '/login';
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/driver-requests" element={<DriverRequests />} />
                  <Route path="/missions" element={<Missions />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/server-status" element={<ServerStatus />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
