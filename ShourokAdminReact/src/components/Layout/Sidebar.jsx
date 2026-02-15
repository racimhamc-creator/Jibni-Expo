import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  Calendar,
  Ticket,
  UserCheck,
  Video,
  Image,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shirt,
  Bell,
  Smartphone,
  DollarSign,
  FileText,
  Camera,
} from 'lucide-react';
import { getAdminPath } from '../../config/routes';
import { adminAPI } from '../../services/api';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, setIsCollapsed, onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    { path: getAdminPath('dashboard'), icon: LayoutDashboard, label: 'Dashboard' },
    { path: getAdminPath('users'), icon: Users, label: 'Users' },
    { path: getAdminPath('sponsors'), icon: Shield, label: 'Sponsors' },
    { path: getAdminPath('events'), icon: Calendar, label: 'Events' },
    { path: getAdminPath('tickets'), icon: Ticket, label: 'Tickets' },
    { path: getAdminPath('casting'), icon: UserCheck, label: 'Casting' },
    { path: getAdminPath('fashion-groups'), icon: Shirt, label: 'Fashion Groups' },
    { path: getAdminPath('shooting-artists'), icon: Camera, label: 'Shooting Artists' },
    { path: getAdminPath('advertisements'), icon: Video, label: 'Videos' },
    { path: getAdminPath('splash-ads'), icon: Image, label: 'Splash Ads' },
    { path: getAdminPath('reels'), icon: Video, label: 'Reels' },
    { path: getAdminPath('reviews-bug-reports'), icon: MessageSquare, label: 'Reviews & Reports' },
    { path: getAdminPath('notifications'), icon: Bell, label: 'Notifications' },
    { path: getAdminPath('refunds'), icon: DollarSign, label: 'Refunds' },
    { path: getAdminPath('app-logs'), icon: FileText, label: 'App Logs' },
    { path: getAdminPath('settings'), icon: Settings, label: 'Settings' },
    { path: getAdminPath('app-version'), icon: Smartphone, label: 'App Version' },
  ];

  const handleLogout = async () => {
    try {
      // Call logout API
      await adminAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear admin session
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('isAdminLoggedIn');
      
      // Call parent logout handler if provided
      if (onLogout) {
        onLogout();
      }
      
      // Redirect to admin login
      navigate(getAdminPath('login'));
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="14" height="14" rx="3" fill="currentColor"/>
              <rect x="22" y="4" width="14" height="14" rx="3" fill="currentColor" opacity="0.5"/>
              <rect x="4" y="22" width="14" height="14" rx="3" fill="currentColor" opacity="0.5"/>
              <rect x="22" y="22" width="14" height="14" rx="3" fill="currentColor"/>
            </svg>
          </div>
          {!isCollapsed && <span className="logo-text">Shourok</span>}
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
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
              >
                <item.icon size={20} />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
