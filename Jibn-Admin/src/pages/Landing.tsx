import React from 'react';
import { 
  Car, 
  Shield, 
  Clock, 
  MapPin, 
  Star, 
  Download, 
  Smartphone,
  ArrowRight,
  CheckCircle,
  Users,
  Zap,
  Heart
} from 'lucide-react';
import './Landing.css';

const Landing: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <Car size={28} />
            <span>Jibni</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#download">Download</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <div className="hero-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              Fast & Reliable Towing Service
            </div>
            <h1 className="hero-title">
              Stuck on the Road?<br />
              <span className="gradient-text">Jibni is Here</span> to Help!
            </h1>
            <p className="hero-subtitle">
              Get instant roadside assistance anywhere in Algeria. 
              Professional tow truck drivers ready to help you 24/7.
            </p>
            <div className="hero-buttons">
              <a href="#download" className="btn-primary">
                <Download size={20} />
                Download App
              </a>
              <a href="#how-it-works" className="btn-secondary">
                Learn More
                <ArrowRight size={18} />
              </a>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Downloads</span>
              </div>
              <div className="stat">
                <span className="stat-number">500+</span>
                <span className="stat-label">Active Drivers</span>
              </div>
              <div className="stat">
                <span className="stat-number">4.8</span>
                <span className="stat-label">
                  <Star size={14} fill="#FFD700" stroke="#FFD700" /> Rating
                </span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="phone-frame">
                <div className="phone-notch"></div>
                <div className="phone-screen">
                  <div className="app-preview">
                    {/* Top bar */}
                    <div className="app-top-bar">
                      <div className="top-bar-left">
                        <div className="menu-icon">☰</div>
                      </div>
                      <div className="top-bar-center">
                        <span className="app-title">Jibni</span>
                      </div>
                      <div className="top-bar-right">
                        <div className="notification-bell">🔔</div>
                      </div>
                    </div>
                    
                    {/* Map area */}
                    <div className="app-map-preview">
                      {/* Map background with more detail */}
                      <div className="map-background">
                        <div className="map-water"></div>
                        <div className="map-park"></div>
                        <div className="building b1"></div>
                        <div className="building b2"></div>
                        <div className="building b3"></div>
                        <div className="building b4"></div>
                      </div>
                      
                      {/* Roads */}
                      <div className="map-roads">
                        <div className="road road-h1"></div>
                        <div className="road road-h2"></div>
                        <div className="road road-h3"></div>
                        <div className="road road-v1"></div>
                        <div className="road road-v2"></div>
                        <div className="road road-v3"></div>
                      </div>
                      
                      {/* Pickup marker */}
                      <div className="map-marker pickup-marker">
                        <div className="marker-pin">
                          <MapPin size={16} />
                        </div>
                        <div className="marker-pulse"></div>
                        <div className="marker-label">Your Location</div>
                      </div>
                      
                      {/* Destination marker */}
                      <div className="map-marker destination-marker">
                        <div className="marker-pin dest">
                          <MapPin size={16} />
                        </div>
                        <div className="marker-label dest-label">Destination</div>
                      </div>
                      
                      {/* Driver car with animation */}
                      <div className="driver-car">
                        <div className="car-body">
                          <span className="car-emoji">🚗</span>
                        </div>
                        <div className="car-shadow"></div>
                      </div>
                      
                      {/* Route path */}
                      <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#667eea" stopOpacity="0.8"/>
                            <stop offset="100%" stopColor="#764ba2" stopOpacity="0.8"/>
                          </linearGradient>
                        </defs>
                        <path 
                          className="route-path" 
                          d="M 25 65 Q 30 50, 45 45 T 65 30 T 75 20" 
                          fill="none" 
                          stroke="url(#routeGradient)" 
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      
                      {/* Distance/ETA info overlay */}
                      <div className="eta-overlay">
                        <div className="eta-box">
                          <span className="eta-time">2 min</span>
                          <span className="eta-distance">1.2 km</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom sheet / Driver card */}
                    <div className="app-bottom-sheet">
                      <div className="sheet-handle"></div>
                      <div className="driver-card-mini">
                        <div className="driver-avatar-large">
                          <span>👨</span>
                          <div className="verified-badge">✓</div>
                        </div>
                        <div className="driver-details">
                          <div className="driver-name-row">
                            <span className="driver-name-text">Ahmed B.</span>
                            <div className="driver-rating-stars">
                              <Star size={12} fill="#FFD700" stroke="#FFD700" />
                              <span>4.9</span>
                            </div>
                          </div>
                          <div className="driver-vehicle">Toyota Corolla • DZ 1234</div>
                          <div className="driver-price">
                            <span className="price-label">Estimated:</span>
                            <span className="price-amount">500 DA</span>
                          </div>
                        </div>
                        <div className="driver-actions">
                          <button className="action-btn call-btn">📞</button>
                          <button className="action-btn msg-btn">💬</button>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="action-buttons">
                        <button className="cancel-btn">Cancel Ride</button>
                      </div>
                    </div>
                    
                    {/* Bottom nav */}
                    <div className="app-bottom-nav">
                      <div className="nav-item active">
                        <span className="nav-icon">🏠</span>
                        <span className="nav-label">Home</span>
                      </div>
                      <div className="nav-item">
                        <span className="nav-icon">📋</span>
                        <span className="nav-label">Orders</span>
                      </div>
                      <div className="nav-item">
                        <span className="nav-icon">💰</span>
                        <span className="nav-label">Wallet</span>
                      </div>
                      <div className="nav-item">
                        <span className="nav-icon">👤</span>
                        <span className="nav-label">Profile</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="floating-elements">
              <div className="floating-card card-1">
                <Shield size={20} />
                <div className="floating-text">
                  <span className="floating-title">Secure</span>
                  <span className="floating-subtitle">Payments</span>
                </div>
              </div>
              <div className="floating-card card-2">
                <Clock size={20} />
                <div className="floating-text">
                  <span className="floating-title">Fast</span>
                  <span className="floating-subtitle">24/7 Service</span>
                </div>
              </div>
              <div className="floating-card card-3">
                <Star size={20} />
                <div className="floating-text">
                  <span className="floating-title">Top</span>
                  <span className="floating-subtitle">Rated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Why Choose Jibni?</span>
            <h2>Everything You Need for Roadside Assistance</h2>
            <p>We've built the most reliable towing platform in Algeria</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <MapPin size={24} />
              </div>
              <h3>Real-Time Tracking</h3>
              <p>Track your tow truck driver in real-time on the map. Know exactly when they'll arrive.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={24} />
              </div>
              <h3>Fast Response</h3>
              <p>Average response time of under 10 minutes. Get help when you need it most.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3>Secure & Trusted</h3>
              <p>Verified drivers, secure payments, and 24/7 customer support for your peace of mind.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Star size={24} />
              </div>
              <h3>Rate Your Experience</h3>
              <p>Rate your driver and help us maintain high-quality service standards.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Smartphone size={24} />
              </div>
              <h3>Easy Payments</h3>
              <p>Pay securely through the app with multiple payment options available.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <h3>Professional Drivers</h3>
              <p>Our drivers are verified, professional, and trained to handle any roadside situation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Simple Process</span>
            <h2>How Jibni Works</h2>
            <p>Get roadside assistance in just 3 simple steps</p>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">01</div>
              <div className="step-icon">
                <MapPin size={28} />
              </div>
              <h3>Request Help</h3>
              <p>Open the app, set your location, and describe your issue. We'll find the nearest driver.</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">02</div>
              <div className="step-icon">
                <Car size={28} />
              </div>
              <h3>Driver Arrives</h3>
              <p>A verified professional driver arrives at your location with the right equipment.</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">03</div>
              <div className="step-icon">
                <CheckCircle size={28} />
              </div>
              <h3>Get Back on Road</h3>
              <p>Your vehicle is towed safely to your destination. Rate your experience!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="download-section">
        <div className="download-bg-shapes">
          <div className="download-shape shape-1"></div>
          <div className="download-shape shape-2"></div>
          <div className="download-shape shape-3"></div>
        </div>
        <div className="download-container">
          <div className="download-content">
            <div className="download-badge">
              <Smartphone size={16} />
              Mobile App
            </div>
            <h2>Download Jibni Now</h2>
            <p>Get the app and never worry about breakdowns again. Available on both iOS and Android.</p>
            <div className="download-buttons">
              <button type="button" className="download-btn ios">
                <Download size={24} />
                <div className="btn-text">
                  <span className="btn-small">Download on the</span>
                  <span className="btn-large">App Store</span>
                </div>
              </button>
              <button type="button" className="download-btn android">
                <Download size={24} />
                <div className="btn-text">
                  <span className="btn-small">Get it on</span>
                  <span className="btn-large">Google Play</span>
                </div>
              </button>
            </div>
            <div className="download-features">
              <span><CheckCircle size={16} /> Free to download</span>
              <span><CheckCircle size={16} /> No subscription fees</span>
              <span><CheckCircle size={16} /> Pay only for the service</span>
            </div>
            <div className="download-stats">
              <div className="d-stat">
                <span className="d-stat-num">10K+</span>
                <span className="d-stat-label">Downloads</span>
              </div>
              <div className="d-stat">
                <span className="d-stat-num">4.8</span>
                <span className="d-stat-label">App Rating</span>
              </div>
              <div className="d-stat">
                <span className="d-stat-num">500+</span>
                <span className="d-stat-label">Daily Rides</span>
              </div>
            </div>
          </div>
          <div className="download-visual">
            <div className="phones-showcase">
              {/* Main Phone - Home Screen */}
              <div className="phone-main">
                <div className="phone-frame-large">
                  <div className="phone-notch"></div>
                  <div className="phone-screen">
                    {/* App Home Screen */}
                    <div className="app-home-screen">
                      <div className="app-home-header">
                        <div className="app-logo-small">
                          <Car size={20} />
                        </div>
                        <span className="app-name-small">Jibni</span>
                        <div className="menu-btn">☰</div>
                      </div>
                      
                      <div className="home-content">
                        <div className="home-greeting">
                          <span className="greeting-text">Hello, Ahmed! 👋</span>
                          <span className="greeting-sub">How can we help you today?</span>
                        </div>
                        
                        <div className="service-cards">
                          <div className="service-card towing">
                            <div className="service-icon">🚗</div>
                            <span>Towing</span>
                          </div>
                          <div className="service-card fuel">
                            <div className="service-icon">⛽</div>
                            <span>Fuel</span>
                          </div>
                          <div className="service-card battery">
                            <div className="service-icon">🔋</div>
                            <span>Battery</span>
                          </div>
                          <div className="service-card lockout">
                            <div className="service-icon">🔓</div>
                            <span>Lockout</span>
                          </div>
                        </div>
                        
                        <div className="nearby-drivers">
                          <div className="section-title">
                            <span>Nearby Drivers</span>
                            <span className="see-all">See All</span>
                          </div>
                          <div className="driver-mini-cards">
                            <div className="driver-mini-card">
                              <div className="mini-avatar">👨</div>
                              <div className="mini-info">
                                <span className="mini-name">Mohamed</span>
                                <span className="mini-rating">⭐ 4.9</span>
                              </div>
                              <div className="mini-distance">500m</div>
                            </div>
                            <div className="driver-mini-card">
                              <div className="mini-avatar">👩</div>
                              <div className="mini-info">
                                <span className="mini-name">Sara</span>
                                <span className="mini-rating">⭐ 5.0</span>
                              </div>
                              <div className="mini-distance">1.2km</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="home-bottom-nav">
                        <div className="nav-item active"><span>🏠</span></div>
                        <div className="nav-item"><span>📋</span></div>
                        <div className="nav-item"><span>💬</span></div>
                        <div className="nav-item"><span>👤</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Secondary Phone - Request Screen */}
              <div className="phone-secondary">
                <div className="phone-frame-medium">
                  <div className="phone-notch"></div>
                  <div className="phone-screen">
                    <div className="request-screen">
                      <div className="request-header">
                        <span className="back-arrow">←</span>
                        <span>Request Towing</span>
                      </div>
                      
                      <div className="request-map">
                        <div className="request-marker">
                          <MapPin size={20} />
                        </div>
                      </div>
                      
                      <div className="request-form">
                        <div className="form-item">
                          <MapPin size={16} />
                          <span>Current Location</span>
                        </div>
                        <div className="form-item">
                          <MapPin size={16} />
                          <span>Destination</span>
                        </div>
                        <button className="confirm-btn">Confirm Request</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements around phones */}
              <div className="download-floats">
                <div className="download-float float-1">
                  <Shield size={18} />
                  <span>Verified</span>
                </div>
                <div className="download-float float-2">
                  <Zap size={18} />
                  <span>Fast</span>
                </div>
                <div className="download-float float-3">
                  <Star size={18} />
                  <span>Top Rated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Become a Jibni Driver</h2>
            <p>Join our network of professional drivers and earn money on your own schedule.</p>
            <div className="cta-features">
              <div className="cta-feature">
                <Zap size={20} />
                <span>Flexible hours</span>
              </div>
              <div className="cta-feature">
                <Users size={20} />
                <span> Steady income</span>
              </div>
              <div className="cta-feature">
                <Heart size={20} />
                <span>Support 24/7</span>
              </div>
            </div>
            <button type="button" className="btn-primary">
              Apply Now
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-logo">
                <Car size={24} />
                <span>Jibni</span>
              </div>
              <p>Algeria's most trusted roadside assistance app. We're here to help you get back on the road.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Company</h4>
                <button type="button">About Us</button>
                <button type="button">Careers</button>
                <button type="button">Press</button>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <button type="button">Help Center</button>
                <button type="button">Contact Us</button>
                <button type="button">Terms of Service</button>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <button type="button">Privacy Policy</button>
                <button type="button">Cookie Policy</button>
                <button type="button">Driver Terms</button>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Jibni. All rights reserved.</p>
            <div className="social-links">
              <a href="#">Facebook</a>
              <a href="#">Instagram</a>
              <a href="#">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
