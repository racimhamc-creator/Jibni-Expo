import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAuthAPI } from '../../services/api';
import { sanitizeInput, sanitizeEmail, sanitizeUsername } from '../../utils/sanitize';
import './Login.css';
import logoImage from '../../assets/3DLOGO.png';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!username.trim()) {
      errors.username = 'Email/Username is required';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await userAuthAPI.login({ 
        emailOrUsername: username, 
        password 
      });
      
      // Store user info
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('userId', response.data.user.id);
        localStorage.setItem('isLoggedIn', 'true');
      }

      // Call onLogin callback if provided
      if (onLogin) {
        onLogin(response.data);
      }

      // Redirect to home page
      navigate('/home');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please check your email/username and password.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Animated background */}
      <div className="bg-decoration">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="grid-pattern"></div>
      </div>

      <div className="login-content">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="brand-content">
            <div className="brand-logo-wrapper">
              <img src={logoImage} alt="Shorouk Event Logo" className="brand-logo" />
            </div>
            <h1 className="brand-title">Welcome to Shorouk Event</h1>
            <p className="brand-subtitle">
              Join thousands of users discovering exclusive events, applying for casting opportunities, and experiencing the best entertainment in Algeria.
            </p>
            
            <div className="features">
              <div className="feature">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="feature-text">
                  <span className="feature-title">Exclusive Events</span>
                  <span className="feature-desc">Discover premium events</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="feature-text">
                  <span className="feature-title">Casting Opportunities</span>
                  <span className="feature-desc">Apply for modeling roles</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </div>
                <div className="feature-text">
                  <span className="feature-title">Easy Tickets</span>
                  <span className="feature-desc">Purchase tickets instantly</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="login-form-container">
          <div className="login-card">
            <div className="card-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="error-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="form-group">
                <label htmlFor="username">Email / Username</label>
                {fieldErrors.username && <span className="field-error-text">{fieldErrors.username}</span>}
                <div className="input-wrapper">
                  {!username && (
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  )}
                  <input
                    type="text"
                    id="username"
                    value={username}
                    maxLength={255}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      // Sanitize based on whether it looks like email or username
                      const sanitized = rawValue.includes('@') 
                        ? sanitizeEmail(rawValue) 
                        : sanitizeUsername(rawValue);
                      setUsername(sanitized);
                      if (fieldErrors.username) {
                        setFieldErrors({ ...fieldErrors, username: '' });
                      }
                    }}
                    onBlur={(e) => {
                      // Final sanitization on blur
                      const sanitized = e.target.value.includes('@') 
                        ? sanitizeEmail(e.target.value) 
                        : sanitizeUsername(e.target.value);
                      if (sanitized !== e.target.value) {
                        setUsername(sanitized);
                      }
                    }}
                    className={fieldErrors.username ? 'input-error' : ''}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
                <div className="input-wrapper">
                  {!password && (
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    maxLength={128}
                    onChange={(e) => {
                      // Sanitize password input (remove HTML tags but keep special chars for strength)
                      const sanitized = sanitizeInput(e.target.value, 'password');
                      setPassword(sanitized);
                      if (fieldErrors.password) {
                        setFieldErrors({ ...fieldErrors, password: '' });
                      }
                    }}
                    className={fieldErrors.password ? 'input-error' : ''}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <span>Sign in</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="card-footer">
              <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
              <div className="security-badges">
                <span className="badge">256-bit SSL</span>
                <span className="badge">2FA Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
