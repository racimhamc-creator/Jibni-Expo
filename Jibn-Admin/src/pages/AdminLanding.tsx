import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Car,
  Shield, 
  Users, 
  MapPin, 
  Clock, 
  Database,
  Lock,
  Zap,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Globe,
  Download,
  Cpu,
  Server
} from 'lucide-react';
import { useLandingTranslation } from '../contexts/LandingTranslationContext';
import LanguageSelector from '../components/LanguageSelector';
import './AdminLanding.css';

const AppLanding: React.FC = () => {
  const { t, language } = useLandingTranslation();

  const features = [
    {
      key: "realTimeTracking",
      icon: <MapPin size={24} />,
      title: "Real-Time GPS Tracking",
      description: "Track your tow truck in real-time with accurate ETAs and live location updates.",
      color: "#185ADC"
    },
    {
      key: "instantDispatch",
      icon: <Clock size={24} />,
      title: "Instant Driver Dispatch",
      description: "Our smart system instantly matches you with the nearest available driver.",
      color: "#38b2ac"
    },
    {
      key: "securePayments",
      icon: <Shield size={24} />,
      title: "Secure Digital Payments",
      description: "Pay safely through the app with multiple payment options and digital receipts.",
      color: "#805ad5"
    },
    {
      key: "support247",
      icon: <Users size={24} />,
      title: "24/7 Customer Support",
      description: "Round-the-clock assistance from our dedicated support team.",
      color: "#38b2ac"
    }
  ];

  const metrics = [
    { key: "totalRides", label: "Total Assists", value: "12,847", change: "+23%", icon: <Car size={16} /> },
    { key: "activeDrivers", label: "Active Drivers", value: "523", change: "+12%", icon: <Users size={16} /> },
    { key: "downloads", label: "Downloads", value: "8.2K", change: "+18%", icon: <Download size={16} /> },
    { key: "avgResponse", label: "Avg Response", value: "4.2 min", change: "-18%", icon: <Clock size={16} /> }
  ];

  return (
    <div className={`admin-landing ${language === 'ar' ? 'rtl' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="admin-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">
              <svg
                width={32}
                height={45}
                viewBox="0 0 103 144"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="brand-logo-svg"
              >
                <path
                  d="M47.919.101c22.465-1.413 43.513 12.103 51.247 33.165 8.989 24.48-2.795 46.004-15.648 66.149-9.864 15.456-21.048 30.132-32.32 44.571-.312.079-.417-.199-.592-.364-1.365-1.281-3.392-4.271-4.649-5.89-14.209-18.293-35.805-46.936-43.024-68.596C-8.052 36.184 12.919 2.3 47.919.099V.1zm.96 18.925C21.824 21.16 9.237 54.812 28.52 73.976c-.766 9.136 2.31 17.592 9.936 22.88 17.763 12.312 40.71-3.18 36.38-24.08C93.91 51.89 77.417 16.778 48.879 19.03v-.003z"
                  fill="#fff"
                />
                <path
                  d="M66.328 62.872c8.877 8.762 8.607 23.606-1.513 31.254-11.294 8.537-28.442 3.442-32.588-10.206-1.181-3.89-.259-6.695-.843-10.176-.362-2.155-4.535-5.344-1.917-7.607 2.59-2.24 6.853 2.017 8.434 3.964 3.43 4.225 1.076 7.974 3.56 12.25 4.258 7.327 15.485 6.637 18.18-1.543 3.866-11.74-13.469-13.09-14.314-23.639-.257-3.202.46-6.944.488-10.19-2.42.058-5.828.638-6.412-2.57-.307-1.684-.259-7.72-.057-9.526.215-1.916 1.264-3.262 3.233-3.473 5.842-.628 12.738.48 18.695-.01 1.646.036 2.81 1.692 2.985 3.244.208 1.863.242 7.983-.106 9.715-.8 3.979-4.773 2.139-7.454 2.855.41 2.12-.1 4.498.135 6.594.43 3.83 6.694 6.298 9.497 9.067l-.003-.003z"
                  fill="#fff"
                />
              </svg>
            </div>
            <div>
              <span className="brand-title">Depanini</span>
              <span className="brand-subtitle">Roadside Assistance</span>
            </div>
          </div>
          <div className="nav-actions">
            <Link to="/features" className="nav-link">
              {t('nav.features')}
            </Link>
            <Link to="/how-it-works" className="nav-link">
              {t('nav.howItWorks')}
            </Link>
            <button className="nav-link">{t('nav.download')}</button>
            <button className="btn-primary">
              <Download size={18} />
              {t('nav.downloadApp')}
            </button>
            <LanguageSelector />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid"></div>
          <div className="hero-gradient"></div>
        </div>
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={16} />
              <span>{t('hero.badge')}</span>
            </div>
            <h1 className="hero-title">
              {t('hero.title')}<br />
              <span className="gradient-text">{t('hero.titleHighlight')}</span> {t('hero.titleSuffix')}
            </h1>
            <p className="hero-subtitle">
              {t('hero.subtitle')}
            </p>
            <div className="hero-actions">
              <button className="btn-primary btn-large">
                <Download size={20} />
                {t('hero.downloadApp')}
                <ArrowRight size={18} />
              </button>
              <button className="btn-secondary btn-large">
                <Smartphone size={20} />
                {t('hero.learnMore')}
              </button>
            </div>
            
            {/* Live Stats */}
            <div className="hero-stats">
              {metrics.map((metric, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon">{metric.icon}</div>
                    <span className={`stat-change ${metric.change.startsWith('+') ? 'positive' : 'negative'}`}>
                      {metric.change}
                    </span>
                  </div>
                  <div className="stat-value">{metric.value}</div>
                  <div className="stat-label">{t(`metrics.${metric.key}.label`)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone Mockup with Mission Screenshot */}
          <div className="hero-demo">
            <div className="phone-mockup">
              <div className="phone-frame">
                <div className="phone-notch"></div>
                <div className="phone-screen">
                  <div className="mission-screenshot">
                        {/* Replace with your actual app screenshot */}
                        <div className="screenshot-container">
                          <img 
                            src="/App.jpg" 
                            alt="Depanini App Screenshot"
                            className="screenshot-image"
                          />
                          
                          <div className="screenshot-overlay">
                            <div className="overlay-badge">
                              <Smartphone size={16} />
                              <span>Depanini App</span>
                            </div>
                          </div>
                        </div>
                      </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <Cpu size={16} />
              {t('features.badge')}
            </div>
            <h2>{t('features.title')}</h2>
            <p>{t('features.subtitle')}</p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
                  {feature.icon}
                </div>
                <h3>{t(`features.items.${feature.key}.title`)}</h3>
                <p>{t(`features.items.${feature.key}.description`)}</p>
                <div className="feature-learn">
                  <span>{t('features.learnMore')}</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="capabilities">
        <div className="container">
          <div className="capabilities-content">
            <div className="capabilities-text">
              <div className="section-badge">
                <Globe size={16} />
                {t('capabilities.badge')}
              </div>
              <h2>{t('capabilities.title')}</h2>
              <p>{t('capabilities.subtitle')}</p>
              
              <div className="capability-list">
                <div className="capability-item">
                  <CheckCircle size={20} className="capability-icon" />
                  <div>
                    <h4>{t('capabilities.features.availability.title')}</h4>
                    <p>{t('capabilities.features.availability.description')}</p>
                  </div>
                </div>
                <div className="capability-item">
                  <CheckCircle size={20} className="capability-icon" />
                  <div>
                    <h4>{t('capabilities.features.coverage.title')}</h4>
                    <span>{t('capabilities.features.coverage.description')}</span>
                  </div>
                </div>
                <div className="capability-item">
                  <CheckCircle size={20} className="capability-icon" />
                  <div>
                    <h4>{t('capabilities.features.reliability.title')}</h4>
                    <p>{t('capabilities.features.reliability.description')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="capabilities-visual">
              <div className="tech-stack">
                <div className="tech-item">
                  <Database size={24} />
                  <span>Real-time Database</span>
                </div>
                <div className="tech-item">
                  <Server size={24} />
                  <span>Cloud Infrastructure</span>
                </div>
                <div className="tech-item">
                  <Lock size={24} />
                  <span>Enterprise Security</span>
                </div>
                <div className="tech-item">
                  <Smartphone size={24} />
                  <span>Mobile API</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <div className="cta-badge">
              <Smartphone size={16} />
              {t('download.badge')}
            </div>
            <h2>{t('download.title')}</h2>
            <p>{t('download.subtitle')}</p>
            
            <div className="cta-actions">
              <button className="btn-primary btn-large">
                <Download size={20} />
                {t('download.appStore')}
                <ArrowRight size={18} />
              </button>
              <button className="btn-secondary btn-large">
                <Download size={20} />
                {t('download.googlePlay')}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          
          {/* Download Phone Mockup */}
          <div className="cta-phone-mockup">
            <div className="phone-frame">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="app-download-screenshot">
                  <img 
                    src="/app-downloadSec.png" 
                    alt="Depanini App Download"
                    className="download-screenshot-image"
                  />
                  <div className="download-overlay">
                    <div className="download-badge">
                      <Download size={16} />
                      <span>Available Now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
              <svg
                width={24}
                height={34}
                viewBox="0 0 103 144"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="footer-logo-svg"
              >
                <path
                  d="M47.919.101c22.465-1.413 43.513 12.103 51.247 33.165 8.989 24.48-2.795 46.004-15.648 66.149-9.864 15.456-21.048 30.132-32.32 44.571-.312.079-.417-.199-.592-.364-1.365-1.281-3.392-4.271-4.649-5.89-14.209-18.293-35.805-46.936-43.024-68.596C-8.052 36.184 12.919 2.3 47.919.099V.1zm.96 18.925C21.824 21.16 9.237 54.812 28.52 73.976c-.766 9.136 2.31 17.592 9.936 22.88 17.763 12.312 40.71-3.18 36.38-24.08C93.91 51.89 77.417 16.778 48.879 19.03v-.003z"
                  fill="#185ADC"
                />
                <path
                  d="M66.328 62.872c8.877 8.762 8.607 23.606-1.513 31.254-11.294 8.537-28.442 3.442-32.588-10.206-1.181-3.89-.259-6.695-.843-10.176-.362-2.155-4.535-5.344-1.917-7.607 2.59-2.24 6.853 2.017 8.434 3.964 3.43 4.225 1.076 7.974 3.56 12.25 4.258 7.327 15.485 6.637 18.18-1.543 3.866-11.74-13.469-13.09-14.314-23.639-.257-3.202.46-6.944.488-10.19-2.42.058-5.828.638-6.412-2.57-.307-1.684-.259-7.72-.057-9.526.215-1.916 1.264-3.262 3.233-3.473 5.842-.628 12.738.48 18.695-.01 1.646.036 2.81 1.692 2.985 3.244.208 1.863.242 7.983-.106 9.715-.8 3.979-4.773 2.139-7.454 2.855.41 2.12-.1 4.498.135 6.594.43 3.83 6.694 6.298 9.497 9.067l-.003-.003z"
                  fill="#FEC846"
                />
              </svg>
              <span>Depanini</span>
            </div>
              <p>{t('footer.brand.tagline')}</p>
            </div>
            
            <div className="footer-links">
              <div className="footer-column">
                <h4>{t('footer.links.product')}</h4>
                <button>{t('footer.links.features')}</button>
                <button>{t('footer.links.pricing')}</button>
                <button>{t('footer.links.apiDocs')}</button>
                <button>{t('footer.links.integrations')}</button>
              </div>
              <div className="footer-column">
                <h4>{t('footer.links.company')}</h4>
                <button>{t('footer.links.about')}</button>
                <button>{t('footer.links.careers')}</button>
                <button>{t('footer.links.blog')}</button>
                <button>{t('footer.links.press')}</button>
              </div>
              <div className="footer-column">
                <h4>{t('footer.links.legal')}</h4>
                <button>{t('footer.links.privacy')}</button>
                <button>{t('footer.links.terms')}</button>
                <button>{t('footer.links.cookies')}</button>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-bottom-links">
              <button>{t('footer.copyright')}</button>
              <button>{t('footer.links.privacy')}</button>
              <button>{t('footer.links.terms')}</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLanding;
