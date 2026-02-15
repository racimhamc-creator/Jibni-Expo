import { Smartphone, Download, Star, Users, Calendar, Video, Award, ArrowRight, CheckCircle } from 'lucide-react';
import './Marketing.css';

const Marketing = () => {
  return (
    <div className="marketing-page">
      <div className="marketing-container">
        {/* Hero Section */}
        <div className="marketing-hero">
          <div className="marketing-badge">
            <Star size={16} />
            <span>Now Available</span>
          </div>
          <h1>Shorouk Event App</h1>
          <p className="marketing-tagline">
            Your Gateway to Exclusive Events, Casting Opportunities, and Entertainment
          </p>
          <div className="marketing-cta">
            <a href="/landing" className="cta-button">
              <Download size={20} />
              Download Now
            </a>
            <a href="/contact" className="cta-button-secondary">
              Contact Us
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2>Why Choose Shorouk Event App?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Calendar size={32} />
              </div>
              <h3>Event Management</h3>
              <p>Discover and purchase tickets for exclusive events. Get instant access to the latest shows, concerts, and special occasions.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Video size={32} />
              </div>
              <h3>Casting Opportunities</h3>
              <p>Apply for casting calls directly from your phone. Upload your portfolio and connect with industry professionals.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Users size={32} />
              </div>
              <h3>Social Features</h3>
              <p>Connect with other users, share reels, follow your favorite creators, and build your entertainment network.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Award size={32} />
              </div>
              <h3>Sponsor Benefits</h3>
              <p>Access exclusive sponsor badges, diplomas, and special offers from our partners.</p>
            </div>
          </div>
        </div>

        {/* Key Features List */}
        <div className="key-features-section">
          <h2>Key Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Easy ticket purchasing and management</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Secure payment processing</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Real-time event updates and notifications</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Video reels and content sharing</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>User profiles and social connections</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Casting application system</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Sponsor badge management</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={20} className="check-icon" />
              <span>Privacy-focused design</span>
            </div>
          </div>
        </div>

        {/* Download Section */}
        <div className="download-section">
          <div className="download-content">
            <Smartphone size={64} className="download-icon" />
            <h2>Get Started Today</h2>
            <p>Download the Shorouk Event App and join thousands of users enjoying exclusive events and opportunities.</p>
            <a href="/landing" className="download-button">
              <Download size={20} />
              Download App
              <ArrowRight size={20} />
            </a>
          </div>
        </div>

        {/* App Stores */}
        <div className="app-stores-section">
          <h3>Available On</h3>
          <div className="app-stores">
            <div className="store-badge">
              <div className="store-icon">🍎</div>
              <div>
                <p className="store-label">Download on the</p>
                <p className="store-name">App Store</p>
              </div>
            </div>
            <div className="store-badge">
              <div className="store-icon">🤖</div>
              <div>
                <p className="store-label">Get it on</p>
                <p className="store-name">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;

