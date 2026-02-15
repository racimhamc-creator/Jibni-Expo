import { useState, useEffect } from 'react';
import { Star, Bug, Eye, Edit2, Trash2, Filter, CheckCircle, XCircle, Archive, Clock } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { reviewsBugReportsAPI } from '../../services/api';
import './ReviewsBugReports.css';

const ReviewsBugReports = () => {
  const [reviewsBugReports, setReviewsBugReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await reviewsBugReportsAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setReviewsBugReports(response.data.reviewsBugReports || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching reviews/bug reports:', error);
      setReviewsBugReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await reviewsBugReportsAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await reviewsBugReportsAPI.update(id, { status: newStatus });
      fetchData();
      fetchStats();
      if (selectedItem && selectedItem._id === id) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this review/bug report?')) {
      try {
        await reviewsBugReportsAPI.delete(id);
        fetchData();
        fetchStats();
        if (selectedItem && selectedItem._id === id) {
          setShowModal(false);
          setSelectedItem(null);
        }
      } catch (error) {
        console.error('Error deleting review/bug report:', error);
        alert('Failed to delete review/bug report');
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="status-icon pending" />;
      case 'read':
        return <Eye size={16} className="status-icon read" />;
      case 'resolved':
        return <CheckCircle size={16} className="status-icon resolved" />;
      case 'archived':
        return <Archive size={16} className="status-icon archived" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'read':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      case 'archived':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const columns = [
    {
      header: 'Type',
      render: (row) => (
        <div className="type-cell">
          {row.type === 'review' ? (
            <Star size={18} className="type-icon review" />
          ) : (
            <Bug size={18} className="type-icon bug" />
          )}
          <span className="type-label">{row.type === 'review' ? 'Review' : 'Bug Report'}</span>
        </div>
      ),
    },
    {
      header: 'User',
      render: (row) => (
        <div className="user-cell">
          {row.userId?.profileImage && (
            <img
              src={row.userId.profileImage}
              alt={row.userId.username || 'User'}
              className="user-avatar"
            />
          )}
          <div className="user-info">
            <span className="user-name">{row.userId?.username || 'Unknown'}</span>
            {row.userId?.email && (
              <span className="user-email">{row.userId.email}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Rating',
      render: (row) => {
        if (row.type === 'review' && row.rating) {
          return (
            <div className="rating-cell">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={star <= row.rating ? 'star-filled' : 'star-empty'}
                />
              ))}
              <span className="rating-value">({row.rating}/5)</span>
            </div>
          );
        }
        return <span className="no-rating">-</span>;
      },
    },
    {
      header: 'Subject',
      render: (row) => (
        <div className="subject-cell">
          <span className="subject-text">{row.subject}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <div className="status-cell">
          {getStatusIcon(row.status)}
          <span
            className="status-label"
            style={{ color: getStatusColor(row.status) }}
          >
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </span>
        </div>
      ),
    },
    {
      header: 'Date',
      render: (row) => (
        <div className="date-cell">
          {new Date(row.createdAt).toLocaleDateString()}
          <span className="date-time">
            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="actions-cell">
          <button
            className="action-btn view-btn"
            onClick={() => handleView(row)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => handleDelete(row._id)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="reviews-bug-reports-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Reviews & Bug Reports</h1>
          <p className="page-subtitle">Manage user feedback and bug reports</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Star size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon review">
              <Star size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.reviews}</span>
              <span className="stat-label">Reviews</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bug">
              <Bug size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.bugs}</span>
              <span className="stat-label">Bug Reports</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          {stats.averageRating && (
            <div className="stat-card">
              <div className="stat-icon rating">
                <Star size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.averageRating.toFixed(1)}</span>
                <span className="stat-label">Avg Rating</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Type:</label>
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
          >
            <option value="">All</option>
            <option value="review">Reviews</option>
            <option value="bug">Bug Reports</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="read">Read</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={reviewsBugReports}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination({ ...pagination, page })}
      />

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedItem.type === 'review' ? 'Review Details' : 'Bug Report Details'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>User Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Username:</span>
                  <span className="detail-value">{selectedItem.userId?.username || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedItem.userId?.email || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Submission Details</h3>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">
                    {selectedItem.type === 'review' ? 'Review' : 'Bug Report'}
                  </span>
                </div>
                {selectedItem.type === 'review' && selectedItem.rating && (
                  <div className="detail-row">
                    <span className="detail-label">Rating:</span>
                    <div className="rating-display">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={star <= selectedItem.rating ? 'star-filled' : 'star-empty'}
                        />
                      ))}
                      <span>({selectedItem.rating}/5)</span>
                    </div>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span
                    className="detail-value"
                    style={{ color: getStatusColor(selectedItem.status) }}
                  >
                    {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Subject</h3>
                <p className="detail-text">{selectedItem.subject}</p>
              </div>

              <div className="detail-section">
                <h3>Message</h3>
                <p className="detail-text">{selectedItem.message}</p>
              </div>

              {selectedItem.adminNotes && (
                <div className="detail-section">
                  <h3>Admin Notes</h3>
                  <p className="detail-text">{selectedItem.adminNotes}</p>
                </div>
              )}

              <div className="detail-section">
                <h3>Update Status</h3>
                <div className="status-buttons">
                  <button
                    className={`status-btn ${selectedItem.status === 'pending' ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate(selectedItem._id, 'pending')}
                  >
                    <Clock size={16} /> Pending
                  </button>
                  <button
                    className={`status-btn ${selectedItem.status === 'read' ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate(selectedItem._id, 'read')}
                  >
                    <Eye size={16} /> Read
                  </button>
                  <button
                    className={`status-btn ${selectedItem.status === 'resolved' ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate(selectedItem._id, 'resolved')}
                  >
                    <CheckCircle size={16} /> Resolved
                  </button>
                  <button
                    className={`status-btn ${selectedItem.status === 'archived' ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate(selectedItem._id, 'archived')}
                  >
                    <Archive size={16} /> Archive
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  handleDelete(selectedItem._id);
                  setShowModal(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsBugReports;

