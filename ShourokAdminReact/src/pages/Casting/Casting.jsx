import { useState, useEffect } from 'react';
import { Eye, Check, X, Clock, Filter, ChevronDown, Download, Users } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { castingAPI, hostessesAPI, talentsAPI } from '../../services/api';
import api from '../../services/api';
import './Casting.css';

const Casting = () => {
  const [activeTab, setActiveTab] = useState('models'); // 'models', 'hostesses', 'talents'
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0, reviewed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  // Get the appropriate API based on active tab
  const getCurrentAPI = () => {
    switch (activeTab) {
      case 'hostesses':
        return hostessesAPI;
      case 'talents':
        return talentsAPI;
      default:
        return castingAPI;
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, [pagination.page, statusFilter, activeTab]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const currentAPI = getCurrentAPI();
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter && { status: statusFilter })
      };
      const response = await currentAPI.getApplications(params);
      setApplications(response.data.applications || response.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const currentAPI = getCurrentAPI();
      const response = await currentAPI.getStats();
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const currentAPI = getCurrentAPI();
      await currentAPI.updateStatus(id, { 
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
        const currentAPI = getCurrentAPI();
        await currentAPI.deleteApplication(id);
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
      case 'reviewed': return 'status-badge--reviewed';
      case 'accepted': return 'status-badge--accepted';
      case 'rejected': return 'status-badge--rejected';
      default: return '';
    }
  };

  // Get columns based on active tab
  const getColumns = () => {
    const baseColumns = [
      {
        header: 'Applicant',
        render: (row) => {
          const photo = row.portraitPhoto || row.facePhoto || (row.portfolioPhotos && row.portfolioPhotos[0]);
          return (
            <div className="applicant-cell">
              <div className="applicant-avatar">
                {photo ? (
                  <img src={photo} alt={row.fullName} />
                ) : (
                  row.fullName?.charAt(0)?.toUpperCase() || 'A'
                )}
              </div>
              <div className="applicant-info">
                <span className="applicant-name">{row.fullName}</span>
                <span className="applicant-age">{row.age} years old</span>
              </div>
            </div>
          );
        }
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
          <span>{row.city || 'N/A'}</span>
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
        width: '180px',
        render: (row) => (
          <div className="actions-cell">
            <button 
              className="action-btn"
              onClick={() => fetchApplicationDetails(row._id)}
              title="View"
            >
              <Eye size={16} />
            </button>
            <button 
              className="action-btn action-btn--download"
              onClick={() => handleDownloadPDF(row.pdfPath, row.fullName, row._id)}
              title="Download PDF"
            >
              <Download size={16} />
            </button>
            <button 
              className="action-btn action-btn--success"
              onClick={() => handleStatusChange(row._id, 'accepted')}
              title="Accept"
              disabled={row.status === 'accepted'}
            >
              <Check size={16} />
            </button>
            <button 
              className="action-btn action-btn--danger"
              onClick={() => handleStatusChange(row._id, 'rejected')}
              title="Reject"
              disabled={row.status === 'rejected'}
            >
              <X size={16} />
            </button>
          </div>
        )
      }
    ];

    // Add tab-specific columns
    if (activeTab === 'hostesses') {
      return [
        ...baseColumns.slice(0, 3),
        {
          header: 'Measurements',
          render: (row) => (
            <div className="measurements-cell">
              <span>H: {row.height || '-'}cm</span>
              <span>Jacket: {row.jacketSize || '-'}</span>
              <span>Shoe: {row.shoeSize || '-'}</span>
            </div>
          )
        },
        {
          header: 'Languages',
          render: (row) => (
            <div className="languages-cell">
              <span>AR: {row.arabicLevel || '-'}</span>
              <span>FR: {row.frenchLevel || '-'}</span>
              <span>EN: {row.englishLevel || '-'}</span>
            </div>
          )
        },
        ...baseColumns.slice(3)
      ];
    } else if (activeTab === 'talents') {
      return [
        ...baseColumns.slice(0, 3),
        {
          header: 'Category',
          render: (row) => (
            <div className="category-cell">
              <span>{row.category || 'N/A'}</span>
              {row.specialty && <span className="specialty">{row.specialty}</span>}
            </div>
          )
        },
        {
          header: 'Physical',
          render: (row) => (
            <div className="physical-cell">
              <span>H: {row.height || '-'}cm</span>
              <span>Eyes: {row.eyeColor || '-'}</span>
              <span>Hair: {row.hairColor || '-'}</span>
            </div>
          )
        },
        ...baseColumns.slice(3)
      ];
    } else {
      // Models tab - original columns
      return [
        ...baseColumns.slice(0, 3),
        {
          header: 'Measurements',
          render: (row) => (
            <div className="measurements-cell">
              <span>H: {row.height}cm</span>
              <span>W: {row.weight}kg</span>
            </div>
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
        ...baseColumns.slice(3)
      ];
    }
  };

  const fetchApplicationDetails = async (id) => {
    try {
      const currentAPI = getCurrentAPI();
      const response = await currentAPI.getApplication(id);
      const appData = response.data.application || response.data;
      setSelectedApp(appData);
    } catch (error) {
      console.error('Error fetching application details:', error);
      const app = applications.find(a => a._id === id);
      setSelectedApp(app);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleDownloadPDF = async (pdfPath, applicantName, applicationId) => {
    try {
      if (!applicationId) {
        alert('Application ID is required to download PDF');
        return;
      }

      const currentAPI = getCurrentAPI();
      
      // Use the API method for PDF download
      const response = await currentAPI.downloadPDF(applicationId);
      
      if (response.status === 200 && response.data instanceof Blob) {
        if (response.data.type === 'application/pdf' || response.data.size > 0) {
          const blob = response.data;
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${activeTab}_${(applicantName || 'application')?.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          console.log('PDF download successful');
        } else {
          throw new Error('Response is not a valid PDF');
        }
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      const errorMsg = error.message || 'Unknown error occurred';
      alert(`Failed to download PDF.\n\nError: ${errorMsg}`);
    }
  };

  const renderApplicationDetails = () => {
    if (!selectedApp) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
        <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Application Details - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
            <button className="close-btn" onClick={() => setSelectedApp(null)}>×</button>
          </div>
          <div className="modal-body">
            <div className="app-header">
              <div className="app-profile">
                <div className="profile-photo">
                  {(selectedApp.portraitPhoto || selectedApp.facePhoto || (selectedApp.portfolioPhotos && selectedApp.portfolioPhotos[0])) ? (
                    <img 
                      src={selectedApp.portraitPhoto || selectedApp.facePhoto || selectedApp.portfolioPhotos[0]} 
                      alt={selectedApp.fullName} 
                    />
                  ) : (
                    <span>{selectedApp.fullName?.charAt(0)}</span>
                  )}
                </div>
                <div className="profile-info">
                  <h4>{selectedApp.fullName}</h4>
                  <p>{selectedApp.age} years old • {selectedApp.city || 'N/A'}</p>
                  <span className={`status-badge ${getStatusClass(selectedApp.status)}`}>
                    {selectedApp.status}
                  </span>
                </div>
              </div>
              <div className="app-actions">
                <button 
                  className="btn-download"
                  onClick={() => handleDownloadPDF(selectedApp.pdfPath, selectedApp.fullName, selectedApp._id)}
                >
                  <Download size={18} />
                  {selectedApp.pdfPath ? 'Download PDF' : 'Generate PDF'}
                </button>
                <button 
                  className="btn-accept"
                  onClick={() => handleStatusChange(selectedApp._id, 'accepted')}
                >
                  <Check size={18} />
                  Accept
                </button>
                <button 
                  className="btn-reject"
                  onClick={() => handleStatusChange(selectedApp._id, 'rejected')}
                >
                  <X size={18} />
                  Reject
                </button>
              </div>
            </div>

            <div className="app-sections">
              <div className="app-section">
                <h5>Contact Information</h5>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email</label>
                    <span>{selectedApp.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <span>{selectedApp.phone}</span>
                  </div>
                  {activeTab === 'hostesses' && (
                    <>
                      <div className="info-item">
                        <label>Education Level</label>
                        <span>{selectedApp.educationLevel || 'N/A'}</span>
                      </div>
                    </>
                  )}
                  {activeTab === 'talents' && (
                    <>
                      <div className="info-item">
                        <label>Category</label>
                        <span>{selectedApp.category || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Specialty</label>
                        <span>{selectedApp.specialty || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {activeTab === 'hostesses' && (
                <>
                  <div className="app-section">
                    <h5>Language Skills</h5>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Arabic</label>
                        <span>{selectedApp.arabicLevel || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>French</label>
                        <span>{selectedApp.frenchLevel || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>English</label>
                        <span>{selectedApp.englishLevel || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Other Languages</label>
                        <span>{selectedApp.otherLanguages || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="app-section">
                    <h5>Uniform Measurements</h5>
                    <div className="measurements-grid">
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.height || '-'}</span>
                        <span className="measurement-label">Height (cm)</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.jacketSize || '-'}</span>
                        <span className="measurement-label">Jacket Size</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.pantsSize || '-'}</span>
                        <span className="measurement-label">Pants Size</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.shoeSize || '-'}</span>
                        <span className="measurement-label">Shoe Size</span>
                      </div>
                    </div>
                  </div>

                  <div className="app-section">
                    <h5>Experience & Availability</h5>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Event Experience</label>
                        <span>{selectedApp.hasEventExperience ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="info-item">
                        <label>Event Types</label>
                        <span>{selectedApp.selectedEventTypes?.join(', ') || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Availability</label>
                        <span>{selectedApp.availability?.join(', ') || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Can Travel</label>
                        <span>{selectedApp.canTravelOutsideWilaya ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="info-item">
                        <label>Driver License</label>
                        <span>{selectedApp.hasDriverLicense ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'talents' && (
                <>
                  <div className="app-section">
                    <h5>Physical Characteristics</h5>
                    <div className="measurements-grid">
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.height || '-'}</span>
                        <span className="measurement-label">Height (cm)</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.eyeColor || '-'}</span>
                        <span className="measurement-label">Eye Color</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-value">{selectedApp.hairColor || '-'}</span>
                        <span className="measurement-label">Hair Color</span>
                      </div>
                      {selectedApp.specialMarks && (
                        <div className="info-item">
                          <label>Special Marks</label>
                          <span>{selectedApp.specialMarks}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="app-section">
                    <h5>Training & Experience</h5>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Training Level</label>
                        <span>{selectedApp.trainingLevel || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Has Agent</label>
                        <span>{selectedApp.hasAgent ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="info-item">
                        <label>Driver License</label>
                        <span>{selectedApp.hasDriverLicense ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedApp.majorWorks && (
                        <div className="info-item full-width">
                          <label>Major Works</label>
                          <span>{selectedApp.majorWorks}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="app-section">
                    <h5>Portfolio & Links</h5>
                    <div className="info-grid">
                      {selectedApp.showreelUrl && (
                        <div className="info-item">
                          <label>Showreel URL</label>
                          <a href={selectedApp.showreelUrl} target="_blank" rel="noopener noreferrer">
                            {selectedApp.showreelUrl}
                          </a>
                        </div>
                      )}
                      {selectedApp.instagramUrl && (
                        <div className="info-item">
                          <label>Instagram</label>
                          <a href={selectedApp.instagramUrl} target="_blank" rel="noopener noreferrer">
                            {selectedApp.instagramUrl}
                          </a>
                        </div>
                      )}
                      {selectedApp.languagesSpoken && selectedApp.languagesSpoken.length > 0 && (
                        <div className="info-item">
                          <label>Languages Spoken</label>
                          <span>{selectedApp.languagesSpoken.join(', ')}</span>
                        </div>
                      )}
                      {selectedApp.specialTalents && selectedApp.specialTalents.length > 0 && (
                        <div className="info-item">
                          <label>Special Talents</label>
                          <span>{selectedApp.specialTalents.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="app-section">
                <h5>Photos</h5>
                <div className="photos-grid">
                  {activeTab === 'hostesses' && (
                    <>
                      {selectedApp.portraitPhoto && (
                        <div className="photo-item">
                          <label>Portrait Photo</label>
                          <img src={selectedApp.portraitPhoto} alt="Portrait" />
                        </div>
                      )}
                      {selectedApp.classicOutfitPhoto && (
                        <div className="photo-item">
                          <label>Classic Outfit Photo</label>
                          <img src={selectedApp.classicOutfitPhoto} alt="Classic Outfit" />
                        </div>
                      )}
                      {selectedApp.profilePhoto && (
                        <div className="photo-item">
                          <label>Profile Photo</label>
                          <img src={selectedApp.profilePhoto} alt="Profile" />
                        </div>
                      )}
                    </>
                  )}
                  {activeTab === 'talents' && selectedApp.portfolioPhotos && selectedApp.portfolioPhotos.length > 0 && (
                    selectedApp.portfolioPhotos.map((photo, index) => (
                      <div key={index} className="photo-item">
                        <label>Portfolio Photo {index + 1}</label>
                        <img src={photo} alt={`Portfolio ${index + 1}`} />
                      </div>
                    ))
                  )}
                  {activeTab === 'models' && (
                    <>
                      {selectedApp.facePhoto && (
                        <div className="photo-item">
                          <label>Face Photo</label>
                          <img src={selectedApp.facePhoto} alt="Face" />
                        </div>
                      )}
                      {selectedApp.fullBodyPhoto && (
                        <div className="photo-item">
                          <label>Full Body Photo</label>
                          <img src={selectedApp.fullBodyPhoto} alt="Full body" />
                        </div>
                      )}
                      {selectedApp.professionalPhotos?.map((photo, index) => (
                        <div key={index} className="photo-item">
                          <label>Professional Photo {index + 1}</label>
                          <img src={photo} alt={`Professional ${index + 1}`} />
                        </div>
                      ))}
                    </>
                  )}
                  {(!selectedApp.portraitPhoto && !selectedApp.facePhoto && !selectedApp.portfolioPhotos && !selectedApp.professionalPhotos) && (
                    <p style={{color: '#999', padding: '20px'}}>No photos available</p>
                  )}
                </div>
              </div>

              {selectedApp.signature && (
                <div className="app-section">
                  <h5>Electronic Signature</h5>
                  <div className="signature-display">
                    <img 
                      src={selectedApp.signature} 
                      alt="Signature" 
                      style={{maxWidth: '100%', maxHeight: '200px', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#fff'}}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="casting-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Casting Applications</h2>
          <p>Review and manage casting applications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="casting-tabs">
        <button 
          className={`tab-button ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('models');
            setPagination(prev => ({ ...prev, page: 1 }));
            setStatusFilter('');
          }}
        >
          <Users size={18} />
          Models
        </button>
        <button 
          className={`tab-button ${activeTab === 'hostesses' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('hostesses');
            setPagination(prev => ({ ...prev, page: 1 }));
            setStatusFilter('');
          }}
        >
          <Users size={18} />
          Hostesses
        </button>
        <button 
          className={`tab-button ${activeTab === 'talents' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('talents');
            setPagination(prev => ({ ...prev, page: 1 }));
            setStatusFilter('');
          }}
        >
          <Users size={18} />
          Talents
        </button>
      </div>

      <div className="casting-stats">
        <div className="stat-card total">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Applications</span>
          </div>
        </div>
        <div className="stat-card pending">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>
        <div className="stat-card accepted">
          <Check size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.accepted}</span>
            <span className="stat-label">Accepted</span>
          </div>
        </div>
        <div className="stat-card rejected">
          <X size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={18} />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={16} />
        </div>
      </div>

      <DataTable
        columns={getColumns()}
        data={applications}
        loading={loading}
        pagination={pagination.pages > 1 ? pagination : null}
        onPageChange={handlePageChange}
        emptyMessage="No applications found"
      />

      {/* Application Detail Modal */}
      {renderApplicationDetails()}
    </div>
  );
};

export default Casting;
