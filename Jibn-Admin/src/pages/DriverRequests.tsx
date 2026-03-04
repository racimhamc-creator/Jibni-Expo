import React, { useState, useEffect } from 'react';
import { adminAPI, DriverRequest } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import './DriverRequests.css';

const DriverRequests: React.FC = () => {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<DriverRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [licenceId, setLicenceId] = useState('');
  const [grayCardId, setGrayCardId] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDriverRequests({ limit: 1000 });
      setRequests(data.requests || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || t('failedToFetchDriverRequests'));
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: DriverRequest) => {
    const name = request.profile?.name || `${request.profile?.firstName || ''} ${request.profile?.lastName || ''}`.trim() || 'Unknown';
    if (!window.confirm(t('approveConfirm') + ' ' + name + '?')) {
      return;
    }

    try {
      const userId = request.user_id || request.userId || request.id;
      if (!userId) {
        alert(t('error') + ': ' + t('userIdNotFound'));
        return;
      }
      await adminAPI.approveRequest(userId.toString(), licenceId || undefined, grayCardId || undefined);
      await fetchRequests();
      setSelectedRequest(null);
      setLicenceId('');
      setGrayCardId('');
      alert(t('requestApproved'));
    } catch (err: any) {
      alert(t('failedToApprove') + ': ' + (err.message || t('unknownError')));
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      alert(t('provideRejectionReason'));
      return;
    }

    try {
      const userId = selectedRequest.user_id || selectedRequest.userId || selectedRequest.id;
      if (!userId) {
        alert(t('error') + ': ' + t('userIdNotFound'));
        return;
      }
      await adminAPI.rejectRequest(userId.toString(), rejectionReason);
      await fetchRequests();
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert(t('requestRejected'));
    } catch (err: any) {
      alert(t('failedToReject') + ': ' + (err.message || t('unknownError')));
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === 'pending') return !req.reviewed;
    if (filter === 'approved') return req.reviewed && req.approved;
    if (filter === 'rejected') return req.reviewed && !req.approved;
    return true;
  });

  const pendingCount = requests.filter(r => !r.reviewed).length;
  const approvedCount = requests.filter(r => r.reviewed && r.approved).length;
  const rejectedCount = requests.filter(r => r.reviewed && !r.approved).length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchRequests} className="retry-button">
            {t('retry') || 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t('driverRequests')}</h2>
        <p className="page-subtitle">{t('manageDriverUpgradeRequests')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{requests.length}</div>
          <div className="stat-label">{t('totalRequests')}</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">{t('pending')}</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-value">{approvedCount}</div>
          <div className="stat-label">{t('approved')}</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-value">{rejectedCount}</div>
          <div className="stat-label">{t('rejected')}</div>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('all')}
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          {t('pending')} ({pendingCount})
        </button>
        <button
          className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          {t('approved')} ({approvedCount})
        </button>
        <button
          className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          {t('rejected')} ({rejectedCount})
        </button>
      </div>

      <div className="requests-grid">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">{t('noRequestsFound')}</div>
        ) : (
          filteredRequests.map((request) => {
            const fullName = request.profile?.name || `${request.profile?.firstName || ''} ${request.profile?.lastName || ''}`.trim() || 'No Name';
            return (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div>
                  <h3>{fullName}</h3>
                  <p className="request-phone">{request.profile?.phoneNumber || request.profile?.phone_number}</p>
                </div>
                <span className={`status-badge ${
                  !request.reviewed ? 'pending' :
                  request.approved ? 'approved' : 'rejected'
                }`}>
                  {!request.reviewed ? '⏳ ' + t('pending') :
                   request.approved ? '✅ ' + t('approved') : '❌ ' + t('rejected')}
                </span>
              </div>

              <div className="request-details">
                <div className="detail-row">
                  <span className="detail-label">{t('city')}:</span>
                  <span className="detail-value">{request.profile?.city}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('submitted')}:</span>
                  <span className="detail-value">
                    {new Date(request.submitted_at || request.submitted_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                {(request.rejectionReason || request.rejection_reason) && (
                  <div className="detail-row">
                    <span className="detail-label">{t('rejectionReason')}:</span>
                    <span className="detail-value rejection-reason">
                      {request.rejectionReason || request.rejection_reason}
                    </span>
                  </div>
                )}
              </div>

              {(request.profile?.drivingLicense || request.profile?.driving_license) && (
                <div className="document-preview">
                  <a
                    href={request.profile?.drivingLicense || request.profile?.driving_license || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    📄 {t('viewDrivingLicense')}
                  </a>
                </div>
              )}

              {(request.profile?.grayCard || request.profile?.gray_card) && (
                <div className="document-preview">
                  <a
                    href={request.profile?.grayCard || request.profile?.gray_card || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    📄 {t('viewGrayCard')}
                  </a>
                </div>
              )}

              {!request.reviewed && (
                <div className="request-actions">
                  <button
                    className="action-button approve"
                    onClick={() => setSelectedRequest(request)}
                  >
                    ✅ {t('approve')}
                  </button>
                  <button
                    className="action-button reject"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectModal(true);
                    }}
                  >
                    ❌ {t('reject')}
                  </button>
                </div>
              )}
            </div>
          )})
        )}
      </div>

      {selectedRequest && !showRejectModal && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('approveRequest')}</h3>
            <p>{t('approveConfirm')} <strong>{selectedRequest.profile?.name || `${selectedRequest.profile?.firstName || ''} ${selectedRequest.profile?.lastName || ''}`}?</strong></p>
            
            <div className="form-group">
              <label>{t('licenceIdOptional')}:</label>
              <input
                type="text"
                value={licenceId}
                onChange={(e) => setLicenceId(e.target.value)}
                placeholder={t('enterLicenceId')}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>{t('grayCardIdOptional')}:</label>
              <input
                type="text"
                value={grayCardId}
                onChange={(e) => setGrayCardId(e.target.value)}
                placeholder={t('enterGrayCardId')}
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-button approve"
                onClick={() => handleApprove(selectedRequest)}
              >
                {t('approve')}
              </button>
              <button
                className="modal-button cancel"
                onClick={() => {
                  setSelectedRequest(null);
                  setLicenceId('');
                  setGrayCardId('');
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('rejectDriverRequest')}</h3>
            <p>{t('rejectConfirm')} <strong>{selectedRequest.profile?.name || `${selectedRequest.profile?.firstName || ''} ${selectedRequest.profile?.lastName || ''}`}</strong>?</p>
            
            <div className="form-group">
              <label>{t('rejectionReasonRequired')}</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('enterRejectionReason')}
                className="form-textarea"
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-button reject"
                onClick={handleReject}
              >
                {t('reject')}
              </button>
              <button
                className="modal-button cancel"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverRequests;
