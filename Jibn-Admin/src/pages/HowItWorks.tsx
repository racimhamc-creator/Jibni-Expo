import React from 'react';
import { 
  Zap,
  CheckCircle,
  Smartphone,
  Users,
  MapPin,
  Clock,
  Shield,
  Lock,
  Phone
} from 'lucide-react';
import './AdminLanding.css';

const HowItWorks: React.FC = () => {
  return (
    <div className="how-it-works-page">
      <div className="container">
        <div className="page-header">
          <div className="page-badge">
            <Zap size={16} />
            How It Works
          </div>
          <h1>Get Roadside Help in 3 Simple Steps</h1>
          <p>Depanini makes getting roadside assistance as easy as ordering a ride. No phone calls, no waiting on hold - just instant help when you need it most.</p>
        </div>

        <div className="steps-showcase">
          {/* Interactive Steps */}
          <div className="steps-timeline">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <div className="step-icon-large">
                  <Smartphone size={48} />
                </div>
                <h3>Request Help Instantly</h3>
                <p>Open the Depanini app and tap the emergency button. Your location is automatically detected, and you can describe your issue with photos or voice notes.</p>
                <div className="step-features">
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Auto-location detection</span>
                  </div>
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Photo & voice description</span>
                  </div>
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Instant price quote</span>
                  </div>
                </div>
              </div>
              <div className="step-visual">
                <div className="phone-mockup-step">
                  <div className="phone-screen-step">
                    <div className="app-interface">
                      <div className="emergency-button">
                        <Zap size={32} />
                        <span>Request Help</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <div className="step-icon-large">
                  <Users size={48} />
                </div>
                <h3>Driver Assigned & On The Way</h3>
                <p>Our smart dispatch system instantly matches you with the nearest available driver. Track their arrival in real-time and communicate directly through the app.</p>
                <div className="step-features">
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Nearest driver matching</span>
                  </div>
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Real-time GPS tracking</span>
                  </div>
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>In-app driver chat</span>
                  </div>
                </div>
              </div>
              <div className="step-visual">
                <div className="tracking-visual">
                  <div className="map-demo">
                    <div className="route-path"></div>
                    <div className="driver-marker">
                      <span>🚗</span>
                    </div>
                    <div className="user-marker">
                      <MapPin size={20} />
                    </div>
                    <div className="eta-badge">
                      <Clock size={14} />
                      <span>8 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <div className="step-icon-large">
                  <CheckCircle size={48} />
                </div>
                <h3>Problem Solved & Payment</h3>
                <p>Your professional driver arrives, assesses the situation, and provides the needed service. Pay securely through the app and rate your experience.</p>
                <div className="step-features">
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Professional service</span>
                  </div>
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Digital payment</span>
                  </div>
                  <div className="step-feature">
                    <CheckCircle size={16} />
                    <span>Service rating</span>
                  </div>
                </div>
              </div>
              <div className="step-visual">
                <div className="completion-visual">
                  <div className="success-animation">
                    <div className="check-circle">
                      <CheckCircle size={48} />
                    </div>
                    <div className="payment-options">
                      <div className="payment-method">💳 Card</div>
                      <div className="payment-method">💰 Cash</div>
                      <div className="payment-method">📱 Wallet</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Types */}
          <div className="service-types">
            <h3>We Handle Every Roadside Situation</h3>
            <div className="services-grid">
              <div className="service-card">
                <div className="service-icon">🔧</div>
                <h4>Mechanical Breakdown</h4>
                <p>Engine issues, battery problems, alternator failures</p>
              </div>
              <div className="service-card">
                <div className="service-icon">🚗</div>
                <h4>Accident Recovery</h4>
                <p>Collision towing, vehicle transport, emergency extraction</p>
              </div>
              <div className="service-card">
                <div className="service-icon">⛽</div>
                <h4>Fuel Delivery</h4>
                <p>Out of fuel assistance, emergency fuel delivery</p>
              </div>
              <div className="service-card">
                <div className="service-icon">🔑</div>
                <h4>Lockout Service</h4>
                <p>Car lockout assistance, key replacement, ignition repair</p>
              </div>
              <div className="service-card">
                <div className="service-icon">🛞</div>
                <h4>Tire Service</h4>
                <p>Flat tire repair, tire change, spare tire installation</p>
              </div>
              <div className="service-card">
                <div className="service-icon">🔋</div>
                <h4>Battery Service</h4>
                <p>Battery jump-start, battery replacement, charging service</p>
              </div>
            </div>
          </div>

          {/* Safety Features */}
          <div className="safety-features">
            <h3>Your Safety is Our Priority</h3>
            <div className="safety-grid">
              <div className="safety-item">
                <div className="safety-icon">
                  <Shield size={32} />
                </div>
                <h4>Verified Drivers</h4>
                <p>All drivers undergo background checks and professional training</p>
              </div>
              <div className="safety-item">
                <div className="safety-icon">
                  <Lock size={32} />
                </div>
                <h4>Secure Payments</h4>
                <p>Encrypted transactions and fraud protection</p>
              </div>
              <div className="safety-item">
                <div className="safety-icon">
                  <Phone size={32} />
                </div>
                <h4>24/7 Support</h4>
                <p>Round-the-clock customer service and emergency assistance</p>
              </div>
              <div className="safety-item">
                <div className="safety-icon">
                  <MapPin size={32} />
                </div>
                <h4>Location Sharing</h4>
                <p>Share your location with family during emergencies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
