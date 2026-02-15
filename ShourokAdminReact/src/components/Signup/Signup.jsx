import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAuthAPI } from '../../services/api';
import { sanitizeInput, sanitizeText, sanitizeEmail, sanitizePhone } from '../../utils/sanitize';
import './Signup.css';
import logoImage from '../../assets/3DLOGO.png';
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form', 'otp', 'success'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthday: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Password strength checker
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 'weak', score: 0 };
    
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    
    if (score <= 2) return { strength: 'weak', score };
    if (score <= 4) return { strength: 'medium', score };
    return { strength: 'strong', score };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.birthday) {
      newErrors.birthday = 'Please select your date of birth';
    } else {
      const age = calculateAge(formData.birthday);
      if (age === null || age < 18) {
        newErrors.birthday = 'You must be at least 18 years old to register';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., name@example.com)';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.length < 9) {
      newErrors.phoneNumber = 'Phone number must contain at least 9 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    } else if (passwordStrength.strength === 'weak') {
      newErrors.password = 'Password is too weak. Use a mix of letters, numbers, and special characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match. Please try again';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Sanitize input based on field type
    let sanitized = value;
    
    switch (field) {
      case 'firstName':
      case 'lastName':
        sanitized = sanitizeText(value);
        break;
      case 'email':
        sanitized = sanitizeEmail(value);
        break;
      case 'phoneNumber':
        // For phone, we'll handle digit extraction separately
        sanitized = value.replace(/\D/g, '');
        break;
      case 'password':
      case 'confirmPassword':
        // Sanitize password (remove HTML tags but keep special chars)
        sanitized = sanitizeInput(value, 'password');
        break;
      default:
        sanitized = sanitizeInput(value, 'text');
    }
    
    setFormData({ ...formData, [field]: sanitized });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSendOTP = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAuthAPI.sendEmailOTP(formData.email);
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }
      setStep('otp');
      setResendTimer(60);
      // Start countdown
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setErrors({ email: error.response?.data?.message || 'Failed to send verification code' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    await handleSendOTP();
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the complete verification code' });
      return;
    }

    setIsLoading(true);
    try {
      const verifyResponse = await userAuthAPI.verifyEmailOTP(formData.email, otpCode);
      
      // Register user - matching backend API format (same as React Native app)
      const registerData = {
        username: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.toLowerCase(),
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        sessionId: verifyResponse.data.sessionId || sessionId,
      };

      const registerResponse = await userAuthAPI.register(registerData);
      
      if (registerResponse.data) {
        setStep('success');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid')) {
        setErrors({ otp: 'Invalid verification code' });
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      } else {
        setErrors({ otp: error.response?.data?.message || 'Registration failed' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Animated background */}
      <div className="bg-decoration">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="grid-pattern"></div>
      </div>

      <div className="signup-content">
        {/* Left side - Branding */}
        <div className="signup-branding">
          <div className="brand-content">
            <div className="brand-logo-wrapper">
              <img src={logoImage} alt="Shorouk Event Logo" className="brand-logo" />
            </div>
            <h1 className="brand-title">Join Shorouk Event</h1>
            <p className="brand-subtitle">
              Create your account to discover exclusive events, apply for casting opportunities, and experience the best entertainment in Algeria.
            </p>
            
            <div className="features">
              <div className="feature">
                <div className="feature-icon">
                  <Calendar size={20} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Exclusive Events</span>
                  <span className="feature-desc">Access premium events</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <User size={20} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Casting Opportunities</span>
                  <span className="feature-desc">Apply for modeling roles</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Easy Tickets</span>
                  <span className="feature-desc">Purchase tickets instantly</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="signup-form-container">
          <div className="signup-card">
            {step === 'form' && (
              <>
                <div className="card-header">
                  <h2>Create Account</h2>
                  <p>Fill in your information to get started</p>
                </div>

                <form className="signup-form" onSubmit={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation();
                  handleSendOTP(); 
                }} noValidate>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      {errors.firstName && <span className="field-error-text">{errors.firstName}</span>}
                      <div className="input-wrapper">
                        {!formData.firstName && <User className="input-icon" size={20} />}
                        <input
                          type="text"
                          id="firstName"
                          value={formData.firstName}
                          maxLength={50}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className={errors.firstName ? 'input-error' : ''}
                          autoComplete="given-name"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      {errors.lastName && <span className="field-error-text">{errors.lastName}</span>}
                      <div className="input-wrapper">
                        {!formData.lastName && <User className="input-icon" size={20} />}
                        <input
                          type="text"
                          id="lastName"
                          value={formData.lastName}
                          maxLength={50}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className={errors.lastName ? 'input-error' : ''}
                          autoComplete="family-name"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="birthday">Birthday</label>
                    {errors.birthday && <span className="field-error-text">{errors.birthday}</span>}
                    <div className="input-wrapper">
                      {!formData.birthday && <Calendar className="input-icon" size={20} />}
                      <input
                        type="date"
                        id="birthday"
                        value={formData.birthday}
                        onChange={(e) => handleInputChange('birthday', e.target.value)}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        min="1900-01-01"
                        className={errors.birthday ? 'input-error' : ''}
                        autoComplete="bday"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    {errors.email && <span className="field-error-text">{errors.email}</span>}
                    <div className="input-wrapper">
                      {!formData.email && <Mail className="input-icon" size={20} />}
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        maxLength={255}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={errors.email ? 'input-error' : ''}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number</label>
                    {errors.phoneNumber && <span className="field-error-text">{errors.phoneNumber}</span>}
                    <div className="input-wrapper">
                      {!formData.phoneNumber && <Phone className="input-icon" size={20} />}
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        maxLength={15}
                        onChange={(e) => {
                          // Extract only digits for phone number
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          handleInputChange('phoneNumber', digitsOnly);
                        }}
                        className={errors.phoneNumber ? 'input-error' : ''}
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    {errors.password && <span className="field-error-text">{errors.password}</span>}
                    <div className="input-wrapper">
                      {!formData.password && <Lock className="input-icon" size={20} />}
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={formData.password}
                        maxLength={128}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={errors.password ? 'input-error' : ''}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {formData.password && !errors.password && (
                      <div className="password-strength-container">
                        <div className="password-strength-bar">
                          <div
                            className={`password-strength-fill password-strength-${passwordStrength.strength}`}
                            style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                          />
                        </div>
                        <span className={`password-strength-text password-strength-${passwordStrength.strength}`}>
                          {passwordStrength.strength === 'weak' ? 'Weak' : passwordStrength.strength === 'medium' ? 'Medium' : 'Strong'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    {errors.confirmPassword && <span className="field-error-text">{errors.confirmPassword}</span>}
                    <div className="input-wrapper">
                      {!formData.confirmPassword && <Lock className="input-icon" size={20} />}
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        maxLength={128}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={errors.confirmPassword ? 'input-error' : ''}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? (
                      <div className="spinner"></div>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>

                <div className="card-footer">
                  <p>Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="card-header">
                  <div className="otp-header-icon">
                    <Mail size={48} />
                  </div>
                  <h2>Verify Your Email</h2>
                  <p>We sent a 6-digit verification code to</p>
                  <p className="otp-email-display">{formData.email}</p>
                </div>

                <div className="otp-container">
                  <div className="otp-inputs-wrapper">
                    <div className="otp-inputs">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onFocus={(e) => e.target.select()}
                          className={`otp-input ${errors.otp ? 'otp-input-error' : ''} ${digit ? 'otp-input-filled' : ''}`}
                          autoComplete="off"
                        />
                      ))}
                    </div>
                    {errors.otp && (
                      <div className="otp-error-message">
                        <span className="field-error-text">{errors.otp}</span>
                      </div>
                    )}
                  </div>

                  <div className="otp-info">
                    <p>Didn't receive the code? Check your spam folder or</p>
                  </div>

                  <div className="otp-actions">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || isLoading}
                      className="resend-btn"
                    >
                      {resendTimer > 0 ? (
                        <>
                          <span>Resend code in</span>
                          <span className="resend-timer">{resendTimer}s</span>
                        </>
                      ) : (
                        'Resend Verification Code'
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={isLoading || otp.join('').length !== 6}
                    className="submit-btn"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Create Account</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setOtp(['', '', '', '', '', '']);
                      setErrors({});
                    }}
                    className="back-btn"
                  >
                    ← Back to form
                  </button>
                </div>
              </>
            )}

            {step === 'success' && (
              <div className="success-container">
                <CheckCircle className="success-icon" size={64} />
                <h2>Account Created!</h2>
                <p>Your account has been created successfully. Redirecting to login...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

