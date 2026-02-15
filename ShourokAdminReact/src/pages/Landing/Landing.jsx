import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Smartphone, Apple, CheckCircle, ArrowRight, Star, Users, Calendar, Video, X, AlertCircle } from 'lucide-react';
import './Landing.css';
import api from '../../services/api';
import logoImage from '../../assets/3DLOGO.png';
import { PUBLIC_ROUTES } from '../../config/routes';

const Landing = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch latest APK info on component mount
  useEffect(() => {
    const fetchApkInfo = async () => {
      try {
        const response = await api.get('/apk/latest');
        if (response.data.success) {
          setApkInfo(response.data.apk);
        }
      } catch (error) {
        console.error('Error fetching APK info:', error);
      }
    };
    fetchApkInfo();
  }, []);

  const handleDownloadClick = () => {
    setShowDownloadModal(true);
  };

  const handleConfirmDownload = async () => {
    setLoading(true);
    try {
      // Build download URL correctly
      // baseURL is: http://168.119.236.241/api (or from api.defaults.baseURL)
      // downloadUrl from API is: /api/apk/download/3
      // We need: http://168.119.236.241/api/apk/download/3
      
      let fullUrl;
      if (apkInfo?.downloadUrl) {
        // downloadUrl already includes /api, so we need to remove /api from baseURL
        const baseURL = api.defaults.baseURL.replace(/\/api$/, '');
        fullUrl = `${baseURL}${apkInfo.downloadUrl}`;
      } else {
        // Fallback: construct manually
        const baseURL = api.defaults.baseURL.replace(/\/api$/, '');
        fullUrl = `${baseURL}/api/apk/download`;
      }
      
      console.log('Download URL:', fullUrl); // Debug log
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = apkInfo?.fileName || 'shourok-app.apk';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowDownloadModal(false);
      setLoading(false);
    } catch (error) {
      console.error('Error downloading APK:', error);
      setLoading(false);
      // Fallback: try direct download URL
      const fallbackUrl = `${api.defaults.baseURL.replace('/api', '')}/downloads/shourok-app.apk`;
      window.location.href = fallbackUrl;
      setShowDownloadModal(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Star size={16} />
            <span>Now Available</span>
          </div>
          <div className="hero-logo-wrapper">
            <img src={logoImage} alt="Shorouk Event Logo" className="hero-logo" />
          </div>
          <h1 className="hero-title">
            Shorouk Event App
          </h1>
          <p className="hero-description">
            Your gateway to exclusive events, casting opportunities, and entertainment experiences. Join the Shorouk community today.
          </p>
          <div className="hero-tagline">
            <p className="hero-tagline-text">
              Shorouk Event - The first professional event management app in Algeria, revolutionizing how you discover, attend, and experience exclusive events.
            </p>
          </div>
          <div className="hero-cta">
            <button className="explore-btn" onClick={() => navigate(PUBLIC_ROUTES.LOGIN)}>
              <span>Explore More</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2>Everything You Need</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Calendar className="feature-icon" />
              </div>
              <h3>Event Tickets</h3>
              <p>Purchase and manage tickets for exclusive events seamlessly</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Users className="feature-icon" />
              </div>
              <h3>Casting Applications</h3>
              <p>Apply for modeling opportunities and showcase your talent</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Video className="feature-icon" />
              </div>
              <h3>Video Content</h3>
              <p>Watch reels, advertisements, and exclusive entertainment content</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Star className="feature-icon" />
              </div>
              <h3>Premium Experience</h3>
              <p>Access exclusive features and connect with the entertainment industry</p>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Instructions Section */}
      <section className="instructions-section">
        <div className="container">
          <div className="section-header">
            <h2>Android Installation Guide</h2>
            <p>Follow these simple steps to install Shorouk Event App on your Android device</p>
          </div>

          <button 
            className="toggle-instructions-btn"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? 'Hide' : 'Show'} Installation Instructions
            <ArrowRight className={showInstructions ? 'rotated' : ''} />
          </button>

          {showInstructions && (
            <div className="instructions-content">
              <div className="instruction-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3>Enable Unknown Sources</h3>
                    <p>Go to <strong>Settings</strong> → <strong>Security</strong> → Enable <strong>"Install from Unknown Sources"</strong> or <strong>"Allow from this source"</strong></p>
                    <div className="step-note">
                      <Smartphone size={16} />
                      <span>On newer Android versions (Android 8+), you'll be prompted to allow installation when you tap the APK file</span>
                    </div>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3>Download the APK</h3>
                    <p>Click the <strong>"Download APK"</strong> button above. The download will start automatically to your device.</p>
                    <div className="step-note">
                      <Download size={16} />
                      <span>File size: ~50MB (approximate). Make sure you have a stable internet connection.</span>
                    </div>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>Open the Downloaded File</h3>
                    <p>Once downloaded, open the APK file from your device's <strong>Downloads</strong> folder or tap the notification when download completes.</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h3>Install the App</h3>
                    <p>Tap <strong>"Install"</strong> when prompted. The installation will complete in a few seconds.</p>
                    <div className="step-note">
                      <CheckCircle size={16} />
                      <span>You may see a security warning - this is normal for apps not from Play Store. Tap "Install anyway" to proceed.</span>
                    </div>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <h3>Launch & Enjoy</h3>
                    <p>Once installed, tap <strong>"Open"</strong> or find the "Shorouk Event App" icon in your app drawer to start using the app.</p>
                  </div>
                </div>
              </div>

              <div className="important-notes">
                <h4>Important Notes</h4>
                <ul>
                  <li>This is a pre-release version. The official app will be available on Google Play Store soon.</li>
                  <li>Make sure you have at least 100MB of free storage space on your device.</li>
                  <li>Keep the app updated by downloading the latest APK when available.</li>
                  <li>If you encounter any issues during installation, contact our support team.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Download Section */}
      <section className="download-section">
        <div className="container">
          <div className="section-header">
            <h2>Download Shorouk Event App</h2>
            <p>Get the app on your preferred platform and start your journey</p>
          </div>
          
          <div className="download-buttons">
            {/* Android Download */}
            <div className="download-card android-card">
              <div className="platform-icon android-icon">
                <svg className="android-logo" viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1349 1.1054L4.8429 5.4533a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.186.8535 12.3074.8535 13.8216v1.6499c0 1.5152 1.8522 2.6366 4.2671 2.6366 1.3789 0 2.6099-.4917 3.5345-1.3319l3.7033 1.6201a.3938.3938 0 00.1546.0312c.054 0 .1111-.0092.1691-.0312l3.7033-1.6201c.9246.84 2.1556 1.3319 3.5345 1.3319 2.4149 0 4.2671-1.1214 4.2671-2.6366v-1.6499c0-1.5152-1.8522-2.6366-4.2671-2.6366-.5479 0-1.0709.0799-1.5579.2276z"/>
                </svg>
              </div>
              <div className="platform-info">
                <h3>Android</h3>
                <p>Download APK Now</p>
              </div>
              <button className="download-btn android-btn" onClick={handleDownloadClick}>
                <Download size={20} />
                <span>Download APK</span>
              </button>
            </div>

            {/* iOS Coming Soon */}
            <div className="download-card ios-card coming-soon">
              <div className="platform-icon ios-icon">
                <Apple size={48} strokeWidth={1.5} />
              </div>
              <div className="platform-info">
                <h3>iOS</h3>
                <p>Coming Soon</p>
              </div>
              <button className="download-btn ios-btn" disabled>
                <span>Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="coming-soon-section">
        <div className="container">
          <div className="coming-soon-content">
            <div className="coming-soon-icon-wrapper">
              <Apple size={48} className="coming-soon-icon" />
            </div>
            <h2>iOS Version Coming Soon</h2>
            <p>We're working hard to bring Shorouk Event App to iOS. Stay tuned for updates!</p>
            <div className="coming-soon-badge">
              <span>Expected: Q1 2025</span>
            </div>
          </div>
        </div>
      </section>

      {/* Download Confirmation Modal */}
      {showDownloadModal && (
        <div className="download-modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="download-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setShowDownloadModal(false)}
              aria-label="Close"
            >
              <X size={24} />
            </button>
            
            <div className="modal-header">
              <div className="modal-icon-wrapper">
                <Download size={40} className="modal-icon" />
              </div>
              <h2>Installation Instructions</h2>
              <p>Please follow these steps to install Shorouk Event App on your Android device</p>
            </div>

            <div className="modal-content">
              <div className="modal-instructions">
                <div className="modal-step">
                  <div className="modal-step-number">1</div>
                  <div className="modal-step-text">
                    <strong>Enable Unknown Sources</strong>
                    <span>Go to Settings → Security → Enable "Install from Unknown Sources"</span>
                  </div>
                </div>
                
                <div className="modal-step">
                  <div className="modal-step-number">2</div>
                  <div className="modal-step-text">
                    <strong>Download the APK</strong>
                    <span>Click "Download Now" below. The file {apkInfo ? `(${(apkInfo.fileSize / 1024 / 1024).toFixed(1)}MB)` : '(~50MB)'} will download to your device.</span>
                  </div>
                </div>
                
                <div className="modal-step">
                  <div className="modal-step-number">3</div>
                  <div className="modal-step-text">
                    <strong>Install the App</strong>
                    <span>Open the downloaded file and tap "Install" when prompted.</span>
                  </div>
                </div>
              </div>

              <div className="modal-warning">
                <AlertCircle size={18} />
                <div>
                  <strong>Important:</strong> This is a pre-release version. Make sure you have at least 100MB of free storage space.
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="modal-cancel-btn"
                onClick={() => setShowDownloadModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-download-btn"
                onClick={handleConfirmDownload}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Download Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2025 Shorouk Event App. All rights reserved.</p>
          <div className="footer-links">
            <a href="/privacy-policy" className="footer-link">Privacy Policy</a>
            <span className="footer-link-separator">•</span>
            <a href="/delete-account" className="footer-link">Delete Account</a>
          </div>
          <p className="footer-note">
            This is a pre-release version. Official release coming to App Store and Google Play Store soon.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
