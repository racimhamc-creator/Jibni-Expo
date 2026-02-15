import React, { useState, useEffect } from 'react';
import { adminAPI, DriverRequest } from '../services/api';
import './DriverRequests.css';

const DriverRequests: React.FC = () => {
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
      const data = await adminAPI.getDriverRequests();
      setRequests(data.requests || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch driver requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: DriverRequest) => {
    if (!window.confirm(`Approve driver request for ${request.profile.name}?`)) {
      return;
    }

    try {
      const userId = request.userId || request._id || request.user_id;
      if (!userId) {
        alert('Error: User ID not found');
        return;
      }
      await adminAPI.approveRequest(userId.toString(), licenceId || undefined, grayCardId || undefined);
      await fetchRequests();
      setSelectedRequest(null);
      setLicenceId('');
      setGrayCardId('');
      alert('Request approved successfully!');
    } catch (err: any) {
      alert('Failed to approve request: ' + (err.message || 'Unknown error'));
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const userId = selectedRequest.userId || selectedRequest._id || selectedRequest.user_id;
      if (!userId) {
        alert('Error: User ID not found');
        return;
      }
      await adminAPI.rejectRequest(userId.toString(), rejectionReason);
      await fetchRequests();
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Request rejected successfully!');
    } catch (err: any) {
      alert('Failed to reject request: ' + (err.message || 'Unknown error'));
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
          <p>Loading driver requests...</p>
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Driver Requests</h2>
        <p className="page-subtitle">Manage driver upgrade requests</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{requests.length}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-value">{approvedCount}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-value">{rejectedCount}</div>
          <div className="stat-label">Rejected</div>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({pendingCount})
        </button>
        <button
          className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved ({approvedCount})
        </button>
        <button
          className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      <div className="requests-grid">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">No requests found</div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div>
                  <h3>{request.profile.name || 'No Name'}</h3>
                  <p className="request-phone">{request.profile.phoneNumber || request.profile.phone_number}</p>
                </div>
                <span className={`status-badge ${
                  !request.reviewed ? 'pending' :
                  request.approved ? 'approved' : 'rejected'
                }`}>
                  {!request.reviewed ? '⏳ Pending' :
                   request.approved ? '✅ Approved' : '❌ Rejected'}
                </span>
              </div>

              <div className="request-details">
                <div className="detail-row">
                  <span className="detail-label">City:</span>
                  <span className="detail-value">{request.profile.city}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Submitted:</span>
                  <span className="detail-value">
                    {new Date(request.submittedAt || request.submitted_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                {(request.rejectionReason || request.rejection_reason) && (
                  <div className="detail-row">
                    <span className="detail-label">Rejection Reason:</span>
                    <span className="detail-value rejection-reason">
                      {request.rejectionReason || request.rejection_reason}
                    </span>
                  </div>
                )}
              </div>

              {(request.profile.drivingLicense || request.profile.driving_license) && (
                <div className="document-preview">
                  <a
                    href={request.profile.drivingLicense || request.profile.driving_license || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    📄 View Driving License
                  </a>
                </div>
              )}

              {(request.profile.grayCard || request.profile.gray_card) && (
                <div className="document-preview">
                  <a
                    href={request.profile.grayCard || request.profile.gray_card || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    📄 View Gray Card
                  </a>
                </div>
              )}

              {!request.reviewed && (
                <div className="request-actions">
                  <button
                    className="action-button approve"
                    onClick={() => setSelectedRequest(request)}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="action-button reject"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectModal(true);
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedRequest && !showRejectModal && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Driver Request</h3>
            <p>Approve request for <strong>{selectedRequest.profile.name}</strong>?</p>
            
            <div className="form-group">
              <label>Licence ID (Optional):</label>
              <input
                type="text"
                value={licenceId}
                onChange={(e) => setLicenceId(e.target.value)}
                placeholder="Enter licence ID"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Gray Card ID (Optional):</label>
              <input
                type="text"
                value={grayCardId}
                onChange={(e) => setGrayCardId(e.target.value)}
                placeholder="Enter gray card ID"
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-button approve"
                onClick={() => handleApprove(selectedRequest)}
              >
                Approve
              </button>
              <button
                className="modal-button cancel"
                onClick={() => {
                  setSelectedRequest(null);
                  setLicenceId('');
                  setGrayCardId('');
                }}
              >
                Cancel
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
            <h3>Reject Driver Request</h3>
            <p>Reject request for <strong>{selectedRequest.profile.name}</strong>?</p>
            
            <div className="form-group">
              <label>Rejection Reason *:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="form-textarea"
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-button reject"
                onClick={handleReject}
              >
                Reject
              </button>
              <button
                className="modal-button cancel"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverRequests;
