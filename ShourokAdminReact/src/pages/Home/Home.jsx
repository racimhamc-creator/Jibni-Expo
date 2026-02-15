import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, 
  Ticket, 
  Camera, 
  Handshake, 
  Mail, 
  Star,
  LogOut,
  User
} from 'lucide-react';
import logoImage from '../../assets/3DLOGO.png';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const cards = [
    {
      id: 'reels',
      icon: PlayCircle,
      title: 'Reels',
      description: 'Discover our Festivals',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      onClick: () => {
        navigate('/reels');
      },
    },
    {
      id: 'events',
      icon: Ticket,
      title: 'Book Tickets',
      description: 'Discover upcoming events',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      onClick: () => {
        navigate('/events-list');
      },
    },
    {
      id: 'facelook',
      icon: Camera,
      title: 'Facelook Studio',
      description: 'Casting & TV production',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      onClick: () => {
        // Navigate to facelook studio page when implemented
        console.log('Navigate to facelook studio');
      },
    },
    {
      id: 'sponsors',
      icon: Handshake,
      title: 'Partnership Space',
      description: 'Access your dashboard',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      onClick: () => {
        // Navigate to sponsors page when implemented
        console.log('Navigate to sponsors');
      },
    },
    {
      id: 'contact',
      icon: Mail,
      title: 'Contact',
      description: 'Get in touch with us',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      onClick: () => {
        navigate('/contact');
      },
    },
    {
      id: 'reviews',
      icon: Star,
      title: 'Reviews & Reports',
      description: 'Share your feedback or report a bug',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      onClick: () => {
        // Navigate to reviews page when implemented
        console.log('Navigate to reviews');
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Animated background */}
      <div className="home-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-grid"></div>
      </div>

      {/* Top Bar - User Info and Logout */}
      <div className="home-top-bar">
        {user && (
          <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.username} />
              ) : (
                <User size={20} />
              )}
            </div>
            <span className="user-name">{user.username || user.email}</span>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="home-main">
        <div className="home-hero">
          <div className="home-logo-wrapper">
            <img src={logoImage} alt="Shorouk Event" className="home-logo" />
          </div>
          <h1 className="home-title">Welcome to Shorouk Event</h1>
          <p className="home-subtitle">Choose how to continue</p>
        </div>

        {/* Cards Grid */}
        <div className="home-cards-grid">
          {cards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                className="home-card"
                style={{ '--card-gradient': card.gradient }}
                onClick={card.onClick}
                data-index={index}
              >
                <div className="card-glow"></div>
                <div className="card-content">
                  <div className="card-icon-wrapper">
                    <div className="radar-signal"></div>
                    <IconComponent size={32} className="card-icon" />
                  </div>
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-description">{card.description}</p>
                  <div className="card-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p className="footer-text">Powered by Shorouk Event</p>
        <div className="footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <span className="footer-divider">•</span>
          <a href="/contact">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;

