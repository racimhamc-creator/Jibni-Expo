import { useState, useEffect } from 'react';
import { Eye, Check, X, Clock, Filter, ChevronDown, Download } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { hostessesAPI } from '../../services/api';
import './Hostesses.css';

const Hostesses = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, contacted: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, [pagination.page, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter && { status: statusFilter })
      };
      const response = await hostessesAPI.getApplications(params);
      setApplications(response.data.applications || response.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching hostesses applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await hostessesAPI.getStats();
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await hostessesAPI.updateStatus(id, { 
        status: newStatus,
        reviewedBy: 'Admin'
      });
      fetchApplications();
      fetchStats();
      if (selectedApp?._id === id) {
        setSelectedApp(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await hostessesAPI.deleteApplication(id);
        fetchApplications();
        fetchStats();
        setSelectedApp(null);
      } catch (error) {
        console.error('Error deleting application:', error);
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-badge--pending';
      case 'contacted': return 'status-badge--reviewed';
      case 'approved': return 'status-badge--accepted';
      case 'rejected': return 'status-badge--rejected';
      default: return '';
    }
  };

  const columns = [
    {
      header: 'Applicant',
      render: (row) => (
        <div className="applicant-cell">
          <div className="applicant-avatar">
            {row.facePhoto ? (
              <img src={row.facePhoto} alt={row.fullName} />
            ) : (
              row.fullName?.charAt(0)?.toUpperCase() || 'A'
            )}
          </div>
          <div className="applicant-info">
            <span className="applicant-name">{row.fullName}</span>
            <span className="applicant-age">{row.age} years old</span>
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      render: (row) => (
        <div className="contact-cell">
          <span>{row.email || 'N/A'}</span>
          <span>{row.phone}</span>
        </div>
      )
    },
    {
      header: 'Location',
      render: (row) => (
        <span>{row.city}{row.wilaya ? `, ${row.wilaya}` : ''}</span>
      )
    },
    {
      header: 'Education',
      render: (row) => (
        <span>{row.educationLevel || 'N/A'}</span>
      )
    },
    {
      header: 'Languages',
      render: (row) => (
        <span>{row.languages && row.languages.length > 0 ? row.languages.length + ' langs' : 'N/A'}</span>
      )
    },
    {
      header: 'Experience',
      width: '100px',
      render: (row) => (
        <span className={`exp-badge ${row.hasPreviousExperience ? 'has-exp' : ''}`}>
          {row.hasPreviousExperience ? 'Experienced' : 'New'}
        </span>
      )
    },
    {
      header: 'Status',
      width: '110px',
      render: (row) => (
        <span className={`status-badge ${getStatusClass(row.status)}`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <div className="action-buttons">
          <button
            className="action-btn action-btn--success"
            onClick={() => handleViewDetails(row._id)}
            title="View Details">
            <Eye size={16} />
          </button>
          <button
            className="action-btn action-btn--download"
            onClick={() => handleDownloadPDF(row._id)}
            title="Download PDF"
            disabled={!row.pdfPath}>
            <Download size={16} />
          </button>
        </div>
      )
    },
  ];

  const handleViewDetails = async (id) => {
    try {
      const response = await hostessesAPI.getApplication(id);
      setSelectedApp(response.data.application);
    } catch (error) {
      console.error('Error fetching application details:', error);
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      const response = await hostessesAPI.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hostesses_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <div className="casting-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-info">
          <h2>Hostesses Applications</h2>
          <p>Manage hostesses casting applications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="casting-stats">
        <div className="stat-card total">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total || 0}</span>
            <span className="stat-label">Total Applications</span>
          </div>
        </div>
        <div className="stat-card pending">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.byStatus?.pending || 0}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card accepted">
          <Check size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.byStatus?.approved || 0}</span>
            <span className="stat-label">Approved</span>
          </div>
        </div>
        <div className="stat-card rejected">
          <X size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.byStatus?.rejected || 0}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={16} />
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />

      {/* Details Modal (Simplified - Can be expanded) */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Application Details</h3>
              <button className="modal-close" onClick={() => setSelectedApp(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="app-header">
                <div className="app-profile">
                  <div className="profile-photo">
                    {selectedApp.facePhoto ? (
                      <img src={selectedApp.facePhoto} alt={selectedApp.fullName} />
                    ) : (
                      selectedApp.fullName?.charAt(0)?.toUpperCase()
                    )}
                  </div>
                  <div className="profile-info">
                    <h4>{selectedApp.fullName}</h4>
                    <p>{selectedApp.email}</p>
                    <p>{selectedApp.phone}</p>
                    <span className={`status-badge ${getStatusClass(selectedApp.status)}`}>
                      {selectedApp.status}
                    </span>
                  </div>
                </div>
                <div className="app-actions">
                  <button className="btn-accept" onClick={() => handleStatusChange(selectedApp._id, 'approved')}>
                    <Check size={18} /> Approve
                  </button>
                  <button className="btn-reject" onClick={() => handleStatusChange(selectedApp._id, 'rejected')}>
                    <X size={18} /> Reject
                  </button>
                  <button className="btn-download" onClick={() => handleDownloadPDF(selectedApp._id)}>
                    <Download size={18} /> PDF
                  </button>
                </div>
              </div>

              <div className="app-sections">
                {/* Personal Information */}
                <div className="app-section">
                  <h5>Personal Information</h5>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Age</label>
                      <span>{selectedApp.age || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Location</label>
                      <span>{selectedApp.city}, {selectedApp.wilaya}</span>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <span>{selectedApp.email || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Phone</label>
                      <span>{selectedApp.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Education & Languages */}
                <div className="app-section">
                  <h5>Education & Languages</h5>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Education Level</label>
                      <span>{selectedApp.educationLevel || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Languages</label>
                      <span>{selectedApp.languages && selected App.languages.length > 0 ? selectedApp.languages.join(', ') : 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Driver License</label>
                      <span>{selectedApp.hasDriverLicense ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="info-item">
                      <label>Vehicle</label>
                      <span>{selectedApp.hasVehicle ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Photos */}
                <div className="app-section">
                  <h5>Photos</h5>
                  <div className="photos-grid">
                    <div className="photo-item">
                      <label>Face Photo</label>
                      {selectedApp.facePhoto && <img src={selectedApp.facePhoto} alt="Face" />}
                    </div>
                    <div className="photo-item">
                      <label>Full Body Photo</label>
                      {selectedApp.fullBodyPhoto && <img src={selectedApp.fullBodyPhoto} alt="Full Body" />}
                    </div>
                  </div>
                </div>

                {/* Signature */}
                {selectedApp.signature && (
                  <div className="app-section">
                    <h5>Electronic Signature</h5>
                    <div className="signature-display">
                      <img src={selectedApp.signature} alt="Signature" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hostesses;
