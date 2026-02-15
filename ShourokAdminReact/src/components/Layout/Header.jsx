import { Bell, Search, User } from 'lucide-react';
import './Header.css';

const Header = ({ title }) => {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="header-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search..." />
        </div>

        <button className="header-btn notification-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <div className="user-menu">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <span className="user-name">Admin</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

