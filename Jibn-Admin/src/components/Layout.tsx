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
  Map,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { mode, toggleTheme } = useTheme();
  const { language, setLanguage, t, dir } = useLanguage();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' as const },
    { path: '/clients', icon: Users, labelKey: 'clients' as const },
    { path: '/drivers', icon: Car, labelKey: 'drivers' as const },
    { path: '/driver-requests', icon: ClipboardList, labelKey: 'driverRequests' as const },
    { path: '/live-drivers', icon: Map, labelKey: 'liveDrivers' as const },
    { path: '/missions', icon: MapPin, labelKey: 'missions' as const },
    { path: '/reports', icon: AlertTriangle, labelKey: 'reports' as const },
    { path: '/server-status', icon: Server, labelKey: 'serverStatus' as const },
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/login');
    }
  };

  const getTitleFromPath = (path: string) => {
    const routeName = path.split('/').pop() || 'dashboard';
    const titles: Record<string, any> = {
      'dashboard': t('dashboard'),
      'clients': t('clients'),
      'drivers': t('drivers'),
      'driver-requests': t('driverRequests'),
      'live-drivers': t('liveDrivers'),
      'missions': t('missions'),
      'reports': t('reports'),
      'server-status': t('serverStatus'),
    };
    return titles[routeName] || t('dashboard');
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  ];

  return (
    <div className={`layout ${isCollapsed ? 'sidebar-collapsed' : ''}`} dir={dir}>
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
                  title={isCollapsed ? t(item.labelKey) : undefined}
                >
                  <item.icon size={20} />
                  {!isCollapsed && <span>{t(item.labelKey)}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? t('logout') : undefined}>
            <LogOut size={20} />
            {!isCollapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="main-header">
          <h1 className="page-title">{getTitleFromPath(location.pathname)}</h1>
          <div className="header-actions">
            {/* Language Selector */}
            <div className="language-selector">
              <Globe size={18} />
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="language-select"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle */}
            <button 
              className="theme-toggle" 
              onClick={toggleTheme}
              title={mode === 'light' ? t('darkMode') : t('lightMode')}
            >
              {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
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
