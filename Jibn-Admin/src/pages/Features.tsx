import React from 'react';
import { 
  MapPin,
  Clock,
  Shield,
  Smartphone,
  Star,
  Cpu,
  Wifi,
  Database,
  Lock
} from 'lucide-react';
import './AdminLanding.css';

const Features: React.FC = () => {
  return (
    <div className="features-page">
      <div className="container">
        <div className="page-header">
          <div className="page-badge">
            <Cpu size={16} />
            Advanced Features
          </div>
          <h1>Powerful Tools for Every Roadside Situation</h1>
          <p>Depanini combines cutting-edge technology with professional service to deliver the most reliable roadside assistance experience in Algeria.</p>
        </div>

        <div className="features-showcase">
          {/* Hero Feature */}
          <div className="hero-feature">
            <div className="hero-feature-content">
              <div className="hero-feature-icon">
                <MapPin size={48} />
              </div>
              <h2>Real-Time GPS Tracking</h2>
              <p>Watch your tow truck approach in real-time. Our advanced GPS system provides accurate ETAs and live location updates, so you never have to wonder when help will arrive.</p>
              <div className="feature-stats">
                <div className="stat-item">
                  <span className="stat-number">95%</span>
                  <span className="stat-label">Accuracy Rate</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">10s</span>
                  <span className="stat-label">Update Interval</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Availability</span>
                </div>
              </div>
            </div>
            <div className="hero-feature-visual">
              <div className="tracking-demo">
                <div className="map-container">
                  <div className="route-line"></div>
                  <div className="truck-marker">
                    <span className="truck-icon">🚗</span>
                  </div>
                  <div className="location-marker">
                    <MapPin size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="features-grid-detailed">
            <div className="feature-card-detailed">
              <div className="feature-card-header">
                <div className="feature-icon-large">
                  <Clock size={32} />
                </div>
                <div>
                  <h3>Lightning Fast Response</h3>
                  <p>Average arrival time under 10 minutes</p>
                </div>
              </div>
              <div className="feature-details">
                <ul>
                  <li>Smart dispatch system finds nearest available driver</li>
                  <li>AI-powered route optimization for fastest arrival</li>
                  <li>Real-time traffic monitoring and avoidance</li>
                  <li>Priority dispatch for emergency situations</li>
                </ul>
              </div>
              <div className="feature-metric">
                <span className="metric-value">4.2 min</span>
                <span className="metric-label">Avg Response Time</span>
              </div>
            </div>

            <div className="feature-card-detailed">
              <div className="feature-card-header">
                <div className="feature-icon-large">
                  <Shield size={32} />
                </div>
                <div>
                  <h3>Verified Professional Drivers</h3>
                  <p>Every driver is background-checked and trained</p>
                </div>
              </div>
              <div className="feature-details">
                <ul>
                  <li>Comprehensive background verification</li>
                  <li>Professional towing certification required</li>
                  <li>Customer service training program</li>
                  <li>Regular performance reviews and ratings</li>
                </ul>
              </div>
              <div className="feature-metric">
                <span className="metric-value">523</span>
                <span className="metric-label">Active Drivers</span>
              </div>
            </div>

            <div className="feature-card-detailed">
              <div className="feature-card-header">
                <div className="feature-icon-large">
                  <Smartphone size={32} />
                </div>
                <div>
                  <h3>Seamless Mobile Experience</h3>
                  <p>Intuitive app designed for stress-free use</p>
                </div>
              </div>
              <div className="feature-details">
                <ul>
                  <li>One-tap emergency request system</li>
                  <li>Automatic location detection</li>
                  <li>In-app chat with driver and support</li>
                  <li>Digital payment and receipt storage</li>
                </ul>
              </div>
              <div className="feature-metric">
                <span className="metric-value">4.8★</span>
                <span className="metric-label">App Rating</span>
              </div>
            </div>

            <div className="feature-card-detailed">
              <div className="feature-card-header">
                <div className="feature-icon-large">
                  <Star size={32} />
                </div>
                <div>
                  <h3>Transparent Pricing</h3>
                  <p>No hidden fees, clear upfront pricing</p>
                </div>
              </div>
              <div className="feature-details">
                <ul>
                  <li>Instant price quote before confirmation</li>
                  <li>No surge pricing or hidden charges</li>
                  <li>Multiple payment options available</li>
                  <li>Detailed invoice with itemized charges</li>
                </ul>
              </div>
              <div className="feature-metric">
                <span className="metric-value">0</span>
                <span className="metric-label">Hidden Fees</span>
              </div>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="tech-stack">
            <h3>Powered by Advanced Technology</h3>
            <div className="tech-grid">
              <div className="tech-item">
                <div className="tech-icon">
                  <MapPin size={24} />
                </div>
                <h4>GPS Technology</h4>
                <p>Precision location tracking with 3-meter accuracy</p>
              </div>
              <div className="tech-item">
                <div className="tech-icon">
                  <Wifi size={24} />
                </div>
                <h4>Real-Time Communication</h4>
                <p>Instant messaging and voice chat capabilities</p>
              </div>
              <div className="tech-item">
                <div className="tech-icon">
                  <Database size={24} />
                </div>
                <h4>Smart Analytics</h4>
                <p>AI-powered route optimization and demand prediction</p>
              </div>
              <div className="tech-item">
                <div className="tech-icon">
                  <Lock size={24} />
                </div>
                <h4>Secure Platform</h4>
                <p>Bank-level encryption for all transactions and data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
