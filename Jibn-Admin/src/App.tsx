import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Drivers from './pages/Drivers';
import DriverRequests from './pages/DriverRequests';
import LiveDrivers from './pages/LiveDrivers';
import Missions from './pages/Missions';
import Reports from './pages/Reports';
import ServerStatus from './pages/ServerStatus';
import Login from './pages/Login';
import Landing from './pages/Landing';
import api from './services/api';
import './App.css';

// Theme-aware app content
const AppContent: React.FC = () => {
  const { mode } = useTheme();
  const [, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', mode);
    document.body.className = mode === 'dark' ? 'dark-mode' : 'light-mode';
  }, [mode]);

  useEffect(() => {
    const user = localStorage.getItem('admin_user');
    setIsAuthenticated(!!user);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/admin-logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <Router>
      <Routes>
        {/* public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
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
                  <Route path="/live-drivers" element={<LiveDrivers />} />
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
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = localStorage.getItem('admin_user');
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
