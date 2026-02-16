import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  MapPin,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Server,
} from 'lucide-react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/drivers', icon: Car, label: 'Drivers' },
    { path: '/driver-requests', icon: ClipboardList, label: 'Driver Requests' },
    { path: '/missions', icon: MapPin, label: 'Missions' },
    { path: '/reports', icon: AlertTriangle, label: 'Reports & Fraud' },
    { path: '/server-status', icon: Server, label: 'Server Status' },
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/login');
    }
  };

  const getTitleFromPath = (path: string) => {
    const routeName = path.split('/').pop() || 'dashboard';
    const titles: Record<string, string> = {
      'dashboard': 'Dashboard',
      'clients': 'Clients',
      'drivers': 'Drivers',
      'driver-requests': 'Driver Requests',
      'missions': 'Missions',
      'reports': 'Reports & Fraud',
      'server-status': 'Server Status',
    };
    return titles[routeName] || 'Dashboard';
  };

  return (
    <div className={`layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Shield size={28} />
            </div>
            {!isCollapsed && <span className="logo-text">Jibni Admin</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon size={20} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? 'Logout' : undefined}>
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="main-header">
          <h1 className="page-title">{getTitleFromPath(location.pathname)}</h1>
          <div className="header-actions">
            {/* You can add header actions here like notifications, profile, etc. */}
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
