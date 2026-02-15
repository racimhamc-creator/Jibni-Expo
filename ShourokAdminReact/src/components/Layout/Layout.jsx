import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const getTitleFromPath = (path) => {
    // Extract the route name from the secret path
    const routeName = path.split('/').pop() || 'dashboard';
    const titles = {
      'dashboard': 'Dashboard',
      'users': 'Users',
      'events': 'Events',
      'tickets': 'Tickets',
      'casting': 'Casting',
      'fashion-groups': 'Fashion Groups',
      'advertisements': 'Videos',
      'reels': 'Reels',
      'reviews-bug-reports': 'Reviews & Reports',
      'notifications': 'Notifications',
      'refunds': 'Refund Requests',
      'settings': 'Settings',
      'app-version': 'App Version Control',
    };
    return titles[routeName] || 'Dashboard';
  };

  return (
    <div className={`layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        onLogout={onLogout}
      />
      <div className="main-wrapper">
        <Header title={getTitleFromPath(location.pathname)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
