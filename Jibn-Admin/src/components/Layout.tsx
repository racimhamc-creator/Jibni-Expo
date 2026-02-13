import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Jibni Admin</h1>
        </div>
        <nav className="sidebar-nav">
          <Link
            to="/users"
            className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
          >
            <span className="nav-icon">👥</span>
            Users
          </Link>
          <Link
            to="/driver-requests"
            className={`nav-link ${location.pathname === '/driver-requests' ? 'active' : ''}`}
          >
            <span className="nav-icon">🚗</span>
            Driver Requests
          </Link>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
