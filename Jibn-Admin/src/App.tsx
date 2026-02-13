import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Users from './pages/Users';
import DriverRequests from './pages/DriverRequests';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<Users />} />
          <Route path="/driver-requests" element={<DriverRequests />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
