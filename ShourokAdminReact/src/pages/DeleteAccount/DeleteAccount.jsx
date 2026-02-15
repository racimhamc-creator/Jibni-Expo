import { useState } from 'react';
import { Trash2, AlertTriangle, Shield, CheckCircle, X } from 'lucide-react';
import api from '../../services/api';
import './DeleteAccount.css';

const DeleteAccount = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDeleteClick = () => {
    if (!emailOrPhone || !password) {
      setError('Please enter your email/phone and password');
      return;
    }
    setShowConfirmModal(true);
    setError('');
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.delete('/auth/delete-account', {
        data: {
          emailOrPhone,
          password,
          userId: userId || undefined,
        },
      });

      if (response.data.success) {
        setSuccess(true);
        setShowConfirmModal(false);
        // Clear form
        setEmailOrPhone('');
        setPassword('');
        setUserId('');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to delete account. Please check your credentials and try again.'
      );
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-account-page">
      <div className="delete-account-container">
        {/* Header */}
        <div className="delete-account-header">
          <div className="delete-icon-wrapper">
            <Trash2 size={48} className="delete-icon" />
          </div>
          <h1>Delete Your Account</h1>
          <p className="delete-subtitle">Shorouk Event App</p>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle size={48} className="success-icon" />
            <h2>Account Deleted Successfully</h2>
            <p>Your account has been permanently deleted. We're sorry to see you go!</p>
            <p className="success-note">
              If you change your mind, you can create a new account anytime.
            </p>
          </div>
        ) : (
          <>
            {/* Warning Section */}
            <div className="warning-section">
              <AlertTriangle size={24} className="warning-icon" />
              <div className="warning-content">
                <h3>Before You Delete</h3>
                <p>Deleting your account will permanently remove:</p>
                <ul>
                  <li>Your profile and personal information</li>
                  <li>Your event tickets and reservations</li>
                  <li>Your casting applications</li>
                  <li>All your app data and preferences</li>
                </ul>
                <p className="warning-note">
                  <strong>This action cannot be undone.</strong> Please make sure you want to proceed.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="delete-account-form">
              <div className="form-group">
                <label htmlFor="emailOrPhone">
                  Email or Phone Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="emailOrPhone"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Enter your email or phone number"
                  disabled={isDeleting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isDeleting}
                />
                <p className="form-help">
                  We need your password to confirm your identity before deleting your account.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="userId">User ID (Optional)</label>
                <input
                  type="text"
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="If you know your user ID, enter it here"
                  disabled={isDeleting}
                />
                <p className="form-help">
                  You can find your User ID in the app settings or profile section.
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <X size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                className="delete-button"
                onClick={handleDeleteClick}
                disabled={isDeleting || !emailOrPhone || !password}
              >
                <Trash2 size={20} />
                <span>{isDeleting ? 'Deleting...' : 'Delete My Account'}</span>
              </button>
            </div>
          </>
        )}

        {/* Info Section */}
        <div className="info-section">
          <Shield size={20} />
          <div>
            <h4>Why do we need your password?</h4>
            <p>
              We require your password to verify your identity and ensure that only you can delete your account. 
              This is a security measure to protect your account from unauthorized deletion.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle size={32} className="modal-warning-icon" />
              <h2>Confirm Account Deletion</h2>
            </div>
            <div className="modal-body">
              <p>Are you absolutely sure you want to delete your account?</p>
              <p className="modal-warning-text">
                This action is <strong>permanent and cannot be undone</strong>. All your data will be 
                permanently deleted.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="modal-delete-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;

