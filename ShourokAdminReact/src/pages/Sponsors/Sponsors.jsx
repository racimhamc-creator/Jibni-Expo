import { useState, useEffect } from 'react';
import { Eye, Phone, Calendar, Edit, Trash2, Plus, Shield, FileText, X, GripVertical, Download } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { sponsorsAPI, badgeConfigurationsAPI } from '../../services/api';
import './Sponsors.css';
import jsPDF from 'jspdf';

// Get API base URL (without /api)
// Use VPS IP, fallback to VITE_API_BASE_URL if set (but not old domain)
let apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://168.119.236.241/api';
if (apiBaseUrl.includes('khadamatpro.net')) {
  apiBaseUrl = 'http://168.119.236.241/api';
}
const API_BASE_URL = apiBaseUrl.replace('/api', '');

const Sponsors = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [badgeConfig, setBadgeConfig] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    options: '',
    isActive: true,
  });
  const [badgeFormData, setBadgeFormData] = useState({
    fahras: '',
    badges: [],
  });
  const [expandedBadges, setExpandedBadges] = useState(new Set());
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      setLoading(true);
      const response = await sponsorsAPI.getAll();
      setSponsors(response.data.sponsors || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      setSponsors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      username: '',
      password: '',
      options: '',
      isActive: true,
    });
    setEditingSponsor(null);
    setShowAddModal(true);
  };

  const handleEdit = (sponsor) => {
    setFormData({
      username: sponsor.username || '',
      password: sponsor.password || '',
      options: sponsor.options || '',
      isActive: sponsor.isActive !== undefined ? sponsor.isActive : true,
    });
    setEditingSponsor(sponsor);
    setShowAddModal(true);
  };

  const handleDelete = async (sponsorId) => {
    if (!window.confirm('Are you sure you want to delete this sponsor?')) {
      return;
    }

    try {
      await sponsorsAPI.delete(sponsorId);
      fetchSponsors();
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      alert('Failed to delete sponsor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSponsor) {
        await sponsorsAPI.update(editingSponsor._id, formData);
      } else {
        await sponsorsAPI.create(formData);
      }
      setShowAddModal(false);
      fetchSponsors();
    } catch (error) {
      console.error('Error saving sponsor:', error);
      alert(error.response?.data?.message || 'Failed to save sponsor');
    }
  };

  const handleManageBadge = async (sponsor) => {
    try {
      // Try to load existing badge configuration
      const options = sponsor.options || sponsor.fahras;
      const response = await badgeConfigurationsAPI.getByFahras(options);
      if (response.data.configuration) {
        setBadgeConfig(response.data.configuration);
        const existingBadges = response.data.configuration.badges || [];
        
        // Ensure we have badges 1 to options
        const allBadges = [];
        const options = sponsor.options || sponsor.fahras;
        for (let i = 1; i <= options; i++) {
          const existingBadge = existingBadges.find(b => b.badgeNumber === i);
          if (existingBadge) {
            allBadges.push(existingBadge);
          } else {
            // Create default badge if not configured
            allBadges.push({
              badgeNumber: i,
              fields: [],
              isActive: true,
            });
          }
        }
        
        setBadgeFormData({
          fahras: sponsor.options || sponsor.fahras,
          badges: allBadges,
        });
      } else {
        // No configuration exists, create badges 1 to options
        const defaultBadges = [];
        const options = sponsor.options || sponsor.fahras;
        for (let i = 1; i <= options; i++) {
          defaultBadges.push({
            badgeNumber: i,
            fields: [],
            isActive: true,
          });
        }
        setBadgeFormData({
          fahras: options,
          badges: defaultBadges,
        });
        setBadgeConfig(null);
      }
      setEditingSponsor(sponsor);
      setExpandedBadges(new Set()); // Reset expanded badges
      setShowBadgeModal(true);
    } catch (error) {
      // Configuration doesn't exist, create badges 1 to options
      const defaultBadges = [];
      const options = sponsor.options || sponsor.fahras;
      for (let i = 1; i <= options; i++) {
        defaultBadges.push({
          badgeNumber: i,
          fields: [],
          isActive: true,
        });
      }
      setBadgeFormData({
        fahras: options,
        badges: defaultBadges,
      });
      setBadgeConfig(null);
      setEditingSponsor(sponsor);
      setExpandedBadges(new Set()); // Reset expanded badges
      setShowBadgeModal(true);
    }
  };

  const toggleBadgeExpanded = (badgeNumber) => {
    const newExpanded = new Set(expandedBadges);
    if (newExpanded.has(badgeNumber)) {
      newExpanded.delete(badgeNumber);
    } else {
      newExpanded.add(badgeNumber);
    }
    setExpandedBadges(newExpanded);
  };

  const handleBadgeSubmit = async (e) => {
    e.preventDefault();
    
    if (!badgeFormData.fahras || badgeFormData.badges.length === 0) {
      alert('At least one badge is required');
      return;
    }

    try {
      if (badgeConfig) {
        await badgeConfigurationsAPI.update(badgeConfig._id, badgeFormData);
      } else {
        await badgeConfigurationsAPI.create(badgeFormData);
      }
      setShowBadgeModal(false);
      alert('Badge configuration saved successfully');
    } catch (error) {
      console.error('Error saving badge configuration:', error);
      alert(error.response?.data?.message || 'Failed to save badge configuration');
    }
  };

  const addBadge = () => {
    const badgeNumber = badgeFormData.badges.length + 1;
    setBadgeFormData({
      ...badgeFormData,
      badges: [
        ...badgeFormData.badges,
        {
          badgeNumber,
          fields: [],
          isActive: true,
        },
      ],
    });
  };

  const removeBadge = (badgeIndex) => {
    setBadgeFormData({
      ...badgeFormData,
      badges: badgeFormData.badges.filter((_, index) => index !== badgeIndex),
    });
  };

  const addField = (badgeIndex) => {
    const updatedBadges = [...badgeFormData.badges];
    updatedBadges[badgeIndex].fields.push({
      name: '',
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      order: updatedBadges[badgeIndex].fields.length,
    });
    setBadgeFormData({ ...badgeFormData, badges: updatedBadges });
  };

  const removeField = (badgeIndex, fieldIndex) => {
    const updatedBadges = [...badgeFormData.badges];
    updatedBadges[badgeIndex].fields = updatedBadges[badgeIndex].fields.filter(
      (_, index) => index !== fieldIndex
    );
    setBadgeFormData({ ...badgeFormData, badges: updatedBadges });
  };

  const updateField = (badgeIndex, fieldIndex, fieldData) => {
    const updatedBadges = [...badgeFormData.badges];
    updatedBadges[badgeIndex].fields[fieldIndex] = {
      ...updatedBadges[badgeIndex].fields[fieldIndex],
      ...fieldData,
    };
    setBadgeFormData({ ...badgeFormData, badges: updatedBadges });
  };

  // Generate PDF with all sponsor data
  const generatePDF = async (sponsor) => {
    setGeneratingPDF(true);
    try {
      const pdf = new jsPDF();
      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;
      const lineHeight = 7;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sponsor Information Report', margin, yPosition);
      yPosition += 15;

      // Sponsor Basic Info
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Basic Information', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Username: ${sponsor.username || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Password: ${sponsor.password || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Options (Badge Count): ${sponsor.options || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`User Email: ${sponsor.userEmail || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`User Name: ${sponsor.userName || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`User Phone: ${sponsor.userPhone || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight + 5;

      // Diploma Information
      if (sponsor.sponsorData?.diploma) {
        checkPageBreak(30);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Diploma Information', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const diploma = sponsor.sponsorData.diploma;
        pdf.text(`First Name: ${diploma.firstName || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Last Name: ${diploma.lastName || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Birth Info: ${diploma.birthInfo || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Birth Place: ${diploma.birthPlace || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Country: ${diploma.country || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Full Address: ${diploma.fullAddress || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Job: ${diploma.job || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Card ID: ${diploma.cardId || 'N/A'}`, margin, yPosition);
        yPosition += lineHeight + 5;

        // Card Scans
        if (diploma.cardScanFront || diploma.cardScanBack) {
          checkPageBreak(60);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('ID Card Scans', margin, yPosition);
          yPosition += 10;

          if (diploma.cardScanFront) {
            try {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = `${API_BASE_URL}${diploma.cardScanFront}`;
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  try {
                    const imgWidth = 80;
                    const imgHeight = (img.height * imgWidth) / img.width;
                    checkPageBreak(imgHeight + 10);
                    pdf.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight);
                    pdf.setFontSize(9);
                    pdf.text('Front Side', margin, yPosition - 5);
                    yPosition += imgHeight + 15;
                    resolve();
                  } catch (error) {
                    pdf.text('Front Side: Image could not be loaded', margin, yPosition);
                    yPosition += lineHeight;
                    resolve();
                  }
                };
                img.onerror = () => {
                  pdf.text('Front Side: Image could not be loaded', margin, yPosition);
                  yPosition += lineHeight;
                  resolve();
                };
                setTimeout(() => resolve(), 3000); // Timeout after 3 seconds
              });
            } catch (error) {
              pdf.text('Front Side: Image could not be loaded', margin, yPosition);
              yPosition += lineHeight;
            }
          }

          if (diploma.cardScanBack) {
            try {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = `${API_BASE_URL}${diploma.cardScanBack}`;
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  try {
                    const imgWidth = 80;
                    const imgHeight = (img.height * imgWidth) / img.width;
                    checkPageBreak(imgHeight + 10);
                    pdf.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight);
                    pdf.setFontSize(9);
                    pdf.text('Back Side', margin, yPosition - 5);
                    yPosition += imgHeight + 15;
                    resolve();
                  } catch (error) {
                    pdf.text('Back Side: Image could not be loaded', margin, yPosition);
                    yPosition += lineHeight;
                    resolve();
                  }
                };
                img.onerror = () => {
                  pdf.text('Back Side: Image could not be loaded', margin, yPosition);
                  yPosition += lineHeight;
                  resolve();
                };
                setTimeout(() => resolve(), 3000);
              });
            } catch (error) {
              pdf.text('Back Side: Image could not be loaded', margin, yPosition);
              yPosition += lineHeight;
            }
          }
        }
      }

      // Logo
      if (sponsor.sponsorData?.logo) {
        checkPageBreak(60);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Logo', margin, yPosition);
        yPosition += 10;

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `${API_BASE_URL}${sponsor.sponsorData.logo}`;
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const imgWidth = 80;
                const imgHeight = (img.height * imgWidth) / img.width;
                checkPageBreak(imgHeight + 10);
                pdf.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 15;
                resolve();
              } catch (error) {
                pdf.text('Logo: Image could not be loaded', margin, yPosition);
                yPosition += lineHeight;
                resolve();
              }
            };
            img.onerror = () => {
              pdf.text('Logo: Image could not be loaded', margin, yPosition);
              yPosition += lineHeight;
              resolve();
            };
            setTimeout(() => resolve(), 3000);
          });
        } catch (error) {
          pdf.text('Logo: Image could not be loaded', margin, yPosition);
          yPosition += lineHeight;
        }
      }

      // Badge Information
      if (sponsor.sponsorBadges && sponsor.sponsorBadges.length > 0) {
        checkPageBreak(30);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Badge Information', margin, yPosition);
        yPosition += 10;

        for (const badge of sponsor.sponsorBadges) {
          checkPageBreak(50);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Badge ${badge.badgeNumber.toString().padStart(2, '0')}`, margin, yPosition);
          yPosition += 10;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          if (badge.fieldValues) {
            for (const field of badge.fieldValues) {
              if (field.fieldName === 'photo' && field.fileUrl) {
                try {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.src = `${API_BASE_URL}${field.fileUrl}`;
                  await new Promise((resolve) => {
                    img.onload = () => {
                      try {
                        const imgWidth = 60;
                        const imgHeight = (img.height * imgWidth) / img.width;
                        checkPageBreak(imgHeight + 10);
                        pdf.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight);
                        pdf.setFontSize(9);
                        pdf.text('Photo', margin, yPosition - 5);
                        yPosition += imgHeight + 10;
                        resolve();
                      } catch (error) {
                        pdf.text('Photo: Image could not be loaded', margin, yPosition);
                        yPosition += lineHeight;
                        resolve();
                      }
                    };
                    img.onerror = () => {
                      pdf.text('Photo: Image could not be loaded', margin, yPosition);
                      yPosition += lineHeight;
                      resolve();
                    };
                    setTimeout(() => resolve(), 3000);
                  });
                } catch (error) {
                  pdf.text('Photo: Image could not be loaded', margin, yPosition);
                  yPosition += lineHeight;
                }
              } else {
                pdf.text(`${field.fieldName}: ${field.value || 'N/A'}`, margin, yPosition);
                yPosition += lineHeight;
              }
            }
          }
          yPosition += 5;
        }
      }

      // Tombola Information
      if (sponsor.sponsorData?.tombola?.instagramLink) {
        checkPageBreak(15);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tombola Information', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Instagram Link: ${sponsor.sponsorData.tombola.instagramLink}`, margin, yPosition);
        yPosition += lineHeight;
      }

      // Signature
      if (sponsor.sponsorData?.signature) {
        checkPageBreak(60);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Electronic Signature', margin, yPosition);
        yPosition += 10;

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `${API_BASE_URL}${sponsor.sponsorData.signature}`;
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const imgWidth = 100;
                const imgHeight = (img.height * imgWidth) / img.width;
                checkPageBreak(imgHeight + 10);
                pdf.addImage(img, 'PNG', margin, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 15;
                resolve();
              } catch (error) {
                pdf.text('Signature: Image could not be loaded', margin, yPosition);
                yPosition += lineHeight;
                resolve();
              }
            };
            img.onerror = () => {
              pdf.text('Signature: Image could not be loaded', margin, yPosition);
              yPosition += lineHeight;
              resolve();
            };
            setTimeout(() => resolve(), 3000);
          });
        } catch (error) {
          pdf.text('Signature: Image could not be loaded', margin, yPosition);
          yPosition += lineHeight;
        }
      }

      // Completion Status
      checkPageBreak(20);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Completion Status', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const status = sponsor.completionStatus || {};
      pdf.text(`Logo: ${status.logo ? 'Completed' : 'Not Completed'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Badge: ${status.badge ? 'Completed' : 'Not Completed'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Diploma: ${status.diploma ? 'Completed' : 'Not Completed'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Tombola: ${status.tombola ? 'Completed' : 'Not Completed'}`, margin, yPosition);
      yPosition += lineHeight;
      if (status.signature !== undefined) {
        pdf.text(`Signature: ${status.signature ? 'Completed' : 'Not Completed'}`, margin, yPosition);
        yPosition += lineHeight;
      }

      // Save PDF
      const fileName = `sponsor_${sponsor.username || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      alert('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const columns = [
    {
      header: 'Username',
      accessor: 'username',
      render: (row) => (
        <div className="phone-cell">
          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{row.username || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Password',
      accessor: 'password',
      render: (row) => (
        <div className="phone-cell">
          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{row.password || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Options',
      accessor: 'options',
      render: (row) => (
        <div className="fahras-cell">
          <Shield size={14} />
          <span className="fahras-badge">{row.options || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'User Email',
      accessor: 'userEmail',
      render: (row) => (
        <span>{row.userEmail || 'N/A'}</span>
      )
    },
    {
      header: 'User Name',
      accessor: 'userName',
      render: (row) => (
        <span>{row.userName || 'N/A'}</span>
      )
    },
    {
      header: 'User Phone',
      accessor: 'userPhone',
      render: (row) => (
        <div className="phone-cell">
          <Phone size={14} />
          <span>{row.userPhone || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <span className={`status-badge ${row.isActive ? 'active' : 'inactive'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Created',
      accessor: 'createdAt',
      render: (row) => (
        <div className="date-cell">
          <Calendar size={14} />
          <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      width: '200px',
      render: (row) => (
        <div className="actions-cell">
          <button 
            className="action-btn"
            onClick={() => setSelectedSponsor(row)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            className="action-btn"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button 
            className="action-btn"
            onClick={() => handleManageBadge(row)}
            title="Manage Badge"
          >
            <FileText size={16} />
          </button>
          <button 
            className="action-btn danger"
            onClick={() => handleDelete(row._id)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="sponsors-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Sponsors Management</h2>
          <p>View and manage all sponsor accounts</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            Add Sponsor
          </button>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{sponsors.length}</span>
            <span className="stat-label">Total Sponsors</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{sponsors.filter(s => s.isActive).length}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sponsors}
        loading={loading}
        emptyMessage="No sponsors found"
      />

      {/* Sponsor Detail Modal */}
      {selectedSponsor && (
        <div className="modal-overlay" onClick={() => setSelectedSponsor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sponsor Details</h3>
              <button className="close-btn" onClick={() => setSelectedSponsor(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Username</label>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>{selectedSponsor.username || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Password</label>
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', color: 'var(--text-primary)' }}>{selectedSponsor.password || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Options (Badge Count)</label>
                  <span className="fahras-badge">{selectedSponsor.options || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>User Email</label>
                  <span>{selectedSponsor.userEmail || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>User Name</label>
                  <span>{selectedSponsor.userName || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>User Phone</label>
                  <span>{selectedSponsor.userPhone || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span className={`status-badge ${selectedSponsor.isActive ? 'active' : 'inactive'}`}>
                    {selectedSponsor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Created</label>
                  <span>{selectedSponsor.createdAt ? new Date(selectedSponsor.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Updated</label>
                  <span>{selectedSponsor.updatedAt ? new Date(selectedSponsor.updatedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {/* Sponsor Data Section */}
              {selectedSponsor.sponsorData && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Sponsor Data</h4>
                  
                  {/* Completion Status */}
                  <div className="detail-grid" style={{ marginBottom: '16px' }}>
                    <div className="detail-item">
                      <label>Logo</label>
                      <span className={`status-badge ${selectedSponsor.completionStatus?.logo ? 'active' : 'inactive'}`}>
                        {selectedSponsor.completionStatus?.logo ? 'Completed' : 'Not Completed'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Badge</label>
                      <span className={`status-badge ${selectedSponsor.completionStatus?.badge ? 'active' : 'inactive'}`}>
                        {selectedSponsor.completionStatus?.badge ? 'Completed' : 'Not Completed'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Diploma</label>
                      <span className={`status-badge ${selectedSponsor.completionStatus?.diploma ? 'active' : 'inactive'}`}>
                        {selectedSponsor.completionStatus?.diploma ? 'Completed' : 'Not Completed'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Tombola</label>
                      <span className={`status-badge ${selectedSponsor.completionStatus?.tombola ? 'active' : 'inactive'}`}>
                        {selectedSponsor.completionStatus?.tombola ? 'Completed' : 'Not Completed'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Signature</label>
                      <span className={`status-badge ${selectedSponsor.completionStatus?.signature ? 'active' : 'inactive'}`}>
                        {selectedSponsor.completionStatus?.signature ? 'Completed' : 'Not Completed'}
                      </span>
                    </div>
                  </div>

                  {/* Logo Data */}
                  {selectedSponsor.sponsorData.logo && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Logo</h5>
                      <div className="detail-item">
                        <label>Logo File</label>
                        <div>
                          <a 
                            href={`${API_BASE_URL}${selectedSponsor.sponsorData.logo}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'underline', marginRight: '10px' }}
                          >
                            View Logo
                          </a>
                          <img 
                            src={`${API_BASE_URL}${selectedSponsor.sponsorData.logo}`} 
                            alt="Sponsor Logo" 
                            style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '10px', borderRadius: '8px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diploma Data */}
                  {selectedSponsor.sponsorData.diploma && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Diploma Information</h5>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>First Name</label>
                          <span>{selectedSponsor.sponsorData.diploma.firstName || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Last Name</label>
                          <span>{selectedSponsor.sponsorData.diploma.lastName || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Birth Info</label>
                          <span>{selectedSponsor.sponsorData.diploma.birthInfo || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Birth Place</label>
                          <span>{selectedSponsor.sponsorData.diploma.birthPlace || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Country</label>
                          <span>{selectedSponsor.sponsorData.diploma.country || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Full Address</label>
                          <span>{selectedSponsor.sponsorData.diploma.fullAddress || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Job</label>
                          <span>{selectedSponsor.sponsorData.diploma.job || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Card ID</label>
                          <span>{selectedSponsor.sponsorData.diploma.cardId || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Card Scans */}
                      {(selectedSponsor.sponsorData.diploma.cardScanFront || selectedSponsor.sponsorData.diploma.cardScanBack) && (
                        <div style={{ marginTop: '16px' }}>
                          <h6 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>ID Card Scans</h6>
                          <div className="detail-grid">
                            {selectedSponsor.sponsorData.diploma.cardScanFront && (
                              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                <label>Front Side</label>
                                <div>
                                  <a 
                                    href={`${API_BASE_URL}${selectedSponsor.sponsorData.diploma.cardScanFront}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--primary)', textDecoration: 'underline', marginRight: '10px' }}
                                  >
                                    View Front Scan
                                  </a>
                                  <img 
                                    src={`${API_BASE_URL}${selectedSponsor.sponsorData.diploma.cardScanFront}`} 
                                    alt="Card Front" 
                                    style={{ maxWidth: '300px', maxHeight: '200px', marginTop: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                  />
                                </div>
                              </div>
                            )}
                            {selectedSponsor.sponsorData.diploma.cardScanBack && (
                              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                <label>Back Side</label>
                                <div>
                                  <a 
                                    href={`${API_BASE_URL}${selectedSponsor.sponsorData.diploma.cardScanBack}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--primary)', textDecoration: 'underline', marginRight: '10px' }}
                                  >
                                    View Back Scan
                                  </a>
                                  <img 
                                    src={`${API_BASE_URL}${selectedSponsor.sponsorData.diploma.cardScanBack}`} 
                                    alt="Card Back" 
                                    style={{ maxWidth: '300px', maxHeight: '200px', marginTop: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Badge Data */}
                  {selectedSponsor.sponsorBadges && selectedSponsor.sponsorBadges.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Badge Information</h5>
                      {selectedSponsor.sponsorBadges.map((badge, index) => (
                        <div key={index} style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <h6 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Badge {badge.badgeNumber.toString().padStart(2, '0')}</h6>
                          <div className="detail-grid">
                            {badge.fieldValues && badge.fieldValues.map((field, fieldIndex) => (
                              <div key={fieldIndex} className="detail-item">
                                <label>{field.fieldName}</label>
                                <span>
                                  {field.fieldName === 'photo' && field.fileUrl ? (
                                    <div>
                                      <a 
                                        href={`${API_BASE_URL}${field.fileUrl}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--primary)', textDecoration: 'underline', marginRight: '10px' }}
                                      >
                                        View Photo
                                      </a>
                                      <img 
                                        src={`${API_BASE_URL}${field.fileUrl}`} 
                                        alt={`Badge ${badge.badgeNumber} Photo`} 
                                        style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                      />
                                    </div>
                                  ) : (
                                    field.value || 'N/A'
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Status: <span className={`status-badge ${badge.status === 'submitted' || badge.status === 'approved' ? 'active' : 'inactive'}`}>
                              {badge.status || 'draft'}
                            </span>
                            {badge.submittedAt && (
                              <span style={{ marginLeft: '12px' }}>
                                Submitted: {new Date(badge.submittedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tombola Data */}
                  {selectedSponsor.sponsorData.tombola?.instagramLink && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Tombola Information</h5>
                      <div className="detail-item">
                        <label>Instagram Link</label>
                        <span>
                          <a href={selectedSponsor.sponsorData.tombola.instagramLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                            {selectedSponsor.sponsorData.tombola.instagramLink}
                          </a>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Signature Data */}
                  {selectedSponsor.sponsorData.signature && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Electronic Signature</h5>
                      <div className="detail-item">
                        <label>Signature File</label>
                        <div>
                          <a 
                            href={`${API_BASE_URL}${selectedSponsor.sponsorData.signature}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'underline', marginRight: '10px' }}
                          >
                            View Signature
                          </a>
                          <img 
                            src={`${API_BASE_URL}${selectedSponsor.sponsorData.signature}`} 
                            alt="Sponsor Signature" 
                            style={{ maxWidth: '300px', maxHeight: '150px', marginTop: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo */}
                  {selectedSponsor.sponsorData.logo && (
                    <div>
                      <h5 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Media Files</h5>
                      <div className="detail-grid">
                        {selectedSponsor.sponsorData.logo && (
                          <div className="detail-item">
                            <label>Logo</label>
                            <span>
                              <a href={`${API_BASE_URL}${selectedSponsor.sponsorData.logo}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                                View Logo
                              </a>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* PDF Download Button */}
              <div className="modal-footer" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => generatePDF(selectedSponsor)}
                  disabled={generatingPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={18} />
                  {generatingPDF ? 'Generating PDF...' : 'Download PDF Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="e.g., BKHEDOUDJA100"
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="e.g., K7m9Pq2X"
                  />
                </div>
                <div className="form-group">
                  <label>Options (Badge Count) *</label>
                  <input
                    type="number"
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: parseInt(e.target.value) || '' })}
                    required
                    min="1"
                    placeholder="2 or 4"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSponsor ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Badge Management Modal */}
      {showBadgeModal && editingSponsor && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content modal-extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Badge - Options {editingSponsor.options || editingSponsor.fahras}</h3>
              <button className="close-btn" onClick={() => setShowBadgeModal(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleBadgeSubmit}>
              <div className="badges-section">
                <div className="section-header">
                  <h4>Badges Configuration</h4>
                </div>

                {badgeFormData.badges.map((badge, badgeIndex) => {
                  const isExpanded = expandedBadges.has(badge.badgeNumber);
                  return (
                    <div key={badgeIndex} className="badge-item">
                      <div className="badge-item-header">
                        <h5>Badge {badge.badgeNumber.toString().padStart(2, '0')}</h5>
                        <button
                          type="button"
                          className="btn-primary btn-small"
                          onClick={() => toggleBadgeExpanded(badge.badgeNumber)}
                        >
                          {isExpanded ? 'Hide Fields' : 'Manage Fields'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="badge-fields-section">
                          <div className="section-header">
                            <span>Fields</span>
                            <button
                              type="button"
                              className="btn-secondary btn-small"
                              onClick={() => addField(badgeIndex)}
                            >
                              <Plus size={14} />
                              Add Field
                            </button>
                          </div>

                          {badge.fields.length === 0 ? (
                            <div className="empty-fields">
                              <p>No fields configured. Click "Add Field" to add fields for this badge.</p>
                            </div>
                          ) : (
                            badge.fields.map((field, fieldIndex) => (
                              <div key={fieldIndex} className="field-config">
                                <div className="field-config-header">
                                  <GripVertical size={16} />
                                  <span>Field {fieldIndex + 1}</span>
                                  <button
                                    type="button"
                                    className="btn-danger btn-small"
                                    onClick={() => removeField(badgeIndex, fieldIndex)}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                <div className="field-form-grid">
                                  <div className="form-group">
                                    <label>Field Name *</label>
                                    <input
                                      type="text"
                                      value={field.name}
                                      onChange={(e) => updateField(badgeIndex, fieldIndex, { name: e.target.value })}
                                      required
                                      placeholder="e.g., title, description"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Field Type *</label>
                                    <select
                                      value={field.type}
                                      onChange={(e) => updateField(badgeIndex, fieldIndex, { type: e.target.value })}
                                      required
                                    >
                                      <option value="text">Text</option>
                                      <option value="textarea">Textarea</option>
                                      <option value="number">Number</option>
                                      <option value="date">Date</option>
                                      <option value="email">Email</option>
                                      <option value="url">URL</option>
                                      <option value="image">Image</option>
                                      <option value="file">File</option>
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label>Label *</label>
                                    <input
                                      type="text"
                                      value={field.label}
                                      onChange={(e) => updateField(badgeIndex, fieldIndex, { label: e.target.value })}
                                      required
                                      placeholder="e.g., Badge Title"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Placeholder</label>
                                    <input
                                      type="text"
                                      value={field.placeholder || ''}
                                      onChange={(e) => updateField(badgeIndex, fieldIndex, { placeholder: e.target.value })}
                                      placeholder="Enter placeholder text"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={field.required || false}
                                        onChange={(e) => updateField(badgeIndex, fieldIndex, { required: e.target.checked })}
                                      />
                                      Required
                                    </label>
                                  </div>
                                  <div className="form-group">
                                    <label>Order</label>
                                    <input
                                      type="number"
                                      value={field.order || fieldIndex}
                                      onChange={(e) => updateField(badgeIndex, fieldIndex, { order: parseInt(e.target.value) || fieldIndex })}
                                      min="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowBadgeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {badgeConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sponsors;

