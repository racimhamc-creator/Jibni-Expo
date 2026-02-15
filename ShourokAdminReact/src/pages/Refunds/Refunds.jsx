import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye, DollarSign, User, Calendar } from 'lucide-react';
import { refundsAPI } from '../../services/api';
import './Refunds.css';

const Refunds = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRefunds();
  }, [filter]);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const response = await refundsAPI.getAll(filter !== 'all' ? { status: filter } : {});
      if (response.data.success) {
        setRefunds(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (refundId) => {
    if (!window.confirm('Are you sure you want to approve this refund request?')) {
      return;
    }

    setProcessing(true);
    try {
      const response = await refundsAPI.approve(refundId);
      if (response.data.success) {
        alert('Refund request approved successfully');
        loadRefunds();
        if (showDetails) {
          setShowDetails(false);
          setSelectedRefund(null);
        }
      } else {
        alert(response.data.message || 'Failed to approve refund request');
      }
    } catch (error) {
      console.error('Error approving refund:', error);
      alert(error.response?.data?.message || 'Error approving refund request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (refundId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!window.confirm('Are you sure you want to reject this refund request?')) {
      return;
    }

    setProcessing(true);
    try {
      const response = await refundsAPI.reject(refundId, rejectReason);
      if (response.data.success) {
        alert('Refund request rejected successfully');
        setRejectReason('');
        loadRefunds();
        if (showDetails) {
          setShowDetails(false);
          setSelectedRefund(null);
        }
      } else {
        alert(response.data.message || 'Failed to reject refund request');
      }
    } catch (error) {
      console.error('Error rejecting refund:', error);
      alert(error.response?.data?.message || 'Error rejecting refund request');
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = async (refundId) => {
    try {
      const response = await refundsAPI.getById(refundId);
      if (response.data.success) {
        setSelectedRefund(response.data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error loading refund details:', error);
      alert('Error loading refund details');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', text: 'Pending', icon: RefreshCw },
      approved: { class: 'status-approved', text: 'Approved', icon: CheckCircle },
      rejected: { class: 'status-rejected', text: 'Rejected', icon: XCircle },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`status-badge ${badge.class}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="refunds-page">
      <div className="refunds-header">
        <div className="refunds-header-content">
          <DollarSign className="refunds-icon" />
          <div>
            <h1>Refund Requests</h1>
            <p>Manage ticket refund requests from users</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={loadRefunds} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="refunds-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}>
          All ({refunds.length})
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}>
          Pending ({refunds.filter(r => r.status === 'pending').length})
        </button>
        <button
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}>
          Approved ({refunds.filter(r => r.status === 'approved').length})
        </button>
        <button
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}>
          Rejected ({refunds.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {/* Refunds List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spinning" size={32} />
          <p>Loading refund requests...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={48} />
          <p>No refund requests found</p>
        </div>
      ) : (
        <div className="refunds-list">
          {refunds.map((refund) => (
            <div key={refund._id} className="refund-card">
              <div className="refund-card-header">
                <div className="refund-card-info">
                  <div className="refund-user-info">
                    <User size={16} />
                    <span className="refund-user-name">
                      {refund.userId?.username || refund.userId?.email || 'Unknown User'}
                    </span>
                    <span className="refund-user-email">
                      {refund.userId?.email || 'No email'}
                    </span>
                  </div>
                  <div className="refund-meta">
                    <Calendar size={14} />
                    <span>{formatDate(refund.createdAt)}</span>
                  </div>
                </div>
                {getStatusBadge(refund.status)}
              </div>

              <div className="refund-card-body">
                <div className="refund-details-row">
                  <div className="refund-detail-item">
                    <span className="refund-detail-label">Event:</span>
                    <span className="refund-detail-value">{refund.eventId?.name || 'N/A'}</span>
                  </div>
                  <div className="refund-detail-item">
                    <span className="refund-detail-label">Tickets:</span>
                    <span className="refund-detail-value">{refund.ticketIds?.length || 0}</span>
                  </div>
                  <div className="refund-detail-item">
                    <span className="refund-detail-label">Amount:</span>
                    <span className="refund-detail-value amount">{refund.calculatedRefundAmount} DA</span>
                  </div>
                </div>

                <div className="refund-payout-info">
                  <span className="refund-detail-label">Payout:</span>
                  <span className="refund-detail-value">
                    {refund.payoutInfo?.type === 'baridimob' ? 'BaridiMob RIP' : refund.payoutInfo?.type === 'cib' ? 'CIB RIP' : refund.payoutInfo?.type?.toUpperCase()} - {refund.payoutInfo?.value}
                  </span>
                </div>
              </div>

              <div className="refund-card-actions">
                <button
                  className="action-btn view-btn"
                  onClick={() => viewDetails(refund._id)}>
                  <Eye size={16} />
                  View Details
                </button>
                {refund.status === 'pending' && (
                  <>
                    <button
                      className="action-btn approve-btn"
                      onClick={() => handleApprove(refund._id)}
                      disabled={processing}>
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      className="action-btn reject-btn"
                      onClick={() => {
                        setSelectedRefund(refund);
                        setShowDetails(true);
                      }}
                      disabled={processing}>
                      <XCircle size={16} />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedRefund && (
        <div className="modal-overlay" onClick={() => {
          setShowDetails(false);
          setSelectedRefund(null);
          setRejectReason('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Refund Request Details</h2>
              <button className="modal-close" onClick={() => {
                setShowDetails(false);
                setSelectedRefund(null);
                setRejectReason('');
              }}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>User Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedRefund.userId?.username || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedRefund.userId?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedRefund.userId?.phoneNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Event Information</h3>
                <div className="detail-item">
                  <span className="detail-label">Event:</span>
                  <span className="detail-value">{selectedRefund.eventId?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Tickets</h3>
                <div className="tickets-list">
                  {selectedRefund.ticketIds?.map((ticket) => (
                    <div key={ticket._id} className="ticket-item">
                      <div className="ticket-info">
                        <span className="ticket-number">{ticket.ticketNumber}</span>
                        <span className="ticket-type">{ticket.ticketType}</span>
                        <span className="ticket-price">{ticket.price} DA</span>
                      </div>
                      <div className="ticket-status">
                        {/* Show ticket state badges */}
                        {ticket.checkoutId && <span className="badge paid">Paid</span>}
                        {ticket.isUsed && <span className="badge used">Used</span>}
                        {/* Only show "Refunded" badge if refund request is approved */}
                        {selectedRefund.status === 'approved' && ticket.isRefunded && (
                          <span className="badge refunded">Refunded</span>
                        )}
                        {/* If request is pending/rejected, don't show refunded badge even if ticket.isRefunded is true */}
                        {selectedRefund.status !== 'approved' && ticket.isRefunded && (
                          <span className="badge warning">⚠️ Previously Refunded</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', padding: '8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                  <strong>Note:</strong> Ticket refund status will be updated when this request is approved.
                </div>
              </div>

              <div className="detail-section">
                <h3>Refund Amount</h3>
                <div className="refund-amount-display">
                  <DollarSign size={24} />
                  <span className="amount-value">{selectedRefund.calculatedRefundAmount} DA</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Payout Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Method:</span>
                    <span className="detail-value">
                      {selectedRefund.payoutInfo?.type === 'baridimob' ? 'BaridiMob RIP' : selectedRefund.payoutInfo?.type === 'cib' ? 'CIB RIP' : selectedRefund.payoutInfo?.type?.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Number:</span>
                    <span className="detail-value">{selectedRefund.payoutInfo?.value}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Request Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    {getStatusBadge(selectedRefund.status)}
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{formatDate(selectedRefund.createdAt)}</span>
                  </div>
                  {selectedRefund.approvedAt && (
                    <div className="detail-item">
                      <span className="detail-label">Approved:</span>
                      <span className="detail-value">{formatDate(selectedRefund.approvedAt)}</span>
                    </div>
                  )}
                  {selectedRefund.rejectedAt && (
                    <div className="detail-item">
                      <span className="detail-label">Rejected:</span>
                      <span className="detail-value">{formatDate(selectedRefund.rejectedAt)}</span>
                    </div>
                  )}
                  {selectedRefund.rejectionReason && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Rejection Reason:</span>
                      <span className="detail-value">{selectedRefund.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRefund.status === 'pending' && (
                <div className="modal-actions">
                  <div className="reject-section">
                    <label htmlFor="reject-reason">Rejection Reason (optional):</label>
                    <textarea
                      id="reject-reason"
                      className="reject-reason-input"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={3}
                    />
                  </div>
                  <div className="action-buttons">
                    <button
                      className="btn btn-approve"
                      onClick={() => handleApprove(selectedRefund._id)}
                      disabled={processing}>
                      <CheckCircle size={18} />
                      Approve Refund
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => handleReject(selectedRefund._id)}
                      disabled={processing}>
                      <XCircle size={18} />
                      Reject Refund
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Refunds;

