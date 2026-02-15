import { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, Video, Play, ExternalLink, Filter } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { advertisementsAPI } from '../../services/api';
import api from '../../services/api';
import './Advertisements.css';

// Helper function to get proper image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a Windows absolute path, extract the relative part
  if (imagePath.includes('\\') || imagePath.match(/^[A-Z]:\\/)) {
    // Extract the part after 'uploads' or convert backslashes to forward slashes
    const normalizedPath = imagePath.replace(/\\/g, '/');
    const uploadsIndex = normalizedPath.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      const relativePath = normalizedPath.substring(uploadsIndex);
      const baseURL = api.defaults.baseURL.replace('/api', '');
      return `${baseURL}${relativePath}`;
    }
    // If no uploads folder found, try to extract just the filename or return null
    return null;
  }
  
  // If it starts with /, it's already a relative path
  if (imagePath.startsWith('/')) {
    const baseURL = api.defaults.baseURL.replace('/api', '');
    return `${baseURL}${imagePath}`;
  }
  
  // Otherwise, treat as relative path
  const baseURL = api.defaults.baseURL.replace('/api', '');
  return `${baseURL}/${imagePath}`;
};

const Advertisements = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAdvertisements();
  }, [filter]);

  const fetchAdvertisements = async () => {
    try {
      setLoading(true);
      const params = {
        ...(filter !== 'all' && { category: filter })
      };
      const response = await advertisementsAPI.getAll(params);
      setAdvertisements(response.data.advertisements || response.data || []);
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      setAdvertisements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      try {
        await advertisementsAPI.delete(id);
        fetchAdvertisements();
      } catch (error) {
        console.error('Error deleting advertisement:', error);
        alert('Failed to delete advertisement');
      }
    }
  };

  const columns = [
    {
      header: 'Video',
      render: (row) => (
        <div className="video-cell">
          <div className="video-thumb">
            {row.coverImage ? (
              <img src={getImageUrl(row.coverImage)} alt={row.title} />
            ) : (
              <Video size={24} />
            )}
            {row.videoPath && (
              <div className="play-overlay">
                <Play size={16} />
              </div>
            )}
          </div>
          <div className="video-info">
            <span className="video-title">{row.title}</span>
            {row.titleAr && <span className="video-title-ar">{row.titleAr}</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      width: '120px',
      render: (row) => (
        <span className="category-badge">{row.category || 'production'}</span>
      )
    },
    {
      header: 'Client',
      render: (row) => (
        <div className="client-cell">
          {row.clientLogo && (
            <img 
              src={getImageUrl(row.clientLogo)} 
              alt={row.clientName}
              className="client-logo"
            />
          )}
          <span>{row.clientName || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Video Source',
      width: '120px',
      render: (row) => (
        <div className="source-cell">
          {row.videoPath ? (
            <span className="source-badge source-uploaded">Uploaded</span>
          ) : row.videoUrl ? (
            <a 
              href={row.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="source-badge source-external"
            >
              <ExternalLink size={12} />
              External
            </a>
          ) : (
            <span className="source-badge">N/A</span>
          )}
        </div>
      )
    },
    {
      header: 'Views',
      width: '80px',
      render: (row) => (
        <span className="views-count">{row.views || 0}</span>
      )
    },
    {
      header: 'Status',
      width: '100px',
      render: (row) => (
        <div className="status-cell">
          <span className={`status-badge status-badge--${row.isActive ? 'active' : 'inactive'}`}>
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
          {row.isFeatured && (
            <span className="featured-badge">Featured</span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      width: '120px',
      render: (row) => (
        <div className="actions-cell">
          <button 
            className="action-btn"
            onClick={() => {
              setSelectedAd(row);
              setShowModal(true);
            }}
            title="View"
          >
            <Eye size={16} />
          </button>
          <button 
            className="action-btn"
            onClick={() => {
              setSelectedAd(row);
              setShowModal(true);
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="action-btn action-btn--danger"
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
    <div className="advertisements-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Advertisements / Videos</h2>
          <p>Manage video advertisements and content</p>
        </div>
        <button className="primary-btn" onClick={() => {
          setSelectedAd(null);
          setShowModal(true);
        }}>
          <Plus size={18} />
          <span>Upload Video</span>
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${filter === 'production' ? 'active' : ''}`}
            onClick={() => setFilter('production')}
          >
            Production
          </button>
          <button 
            className={`filter-tab ${filter === 'advertising' ? 'active' : ''}`}
            onClick={() => setFilter('advertising')}
          >
            Advertising
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={advertisements}
        loading={loading}
        emptyMessage="No advertisements found. Upload your first video!"
      />

      {/* Upload/Edit Modal */}
      {showModal && (
        <AdvertisementModal
          advertisement={selectedAd}
          onClose={() => {
            setShowModal(false);
            setSelectedAd(null);
          }}
          onSuccess={() => {
            fetchAdvertisements();
            setShowModal(false);
            setSelectedAd(null);
          }}
        />
      )}
    </div>
  );
};

// Upload/Edit Modal Component
const AdvertisementModal = ({ advertisement, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    clientName: '',
    category: 'production',
    tags: '',
    isFeatured: false,
    order: '0',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewCover, setPreviewCover] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (advertisement) {
      setFormData({
        title: advertisement.title || '',
        titleAr: advertisement.titleAr || '',
        description: advertisement.description || '',
        descriptionAr: advertisement.descriptionAr || '',
        clientName: advertisement.clientName || '',
        category: advertisement.category || 'production',
        tags: Array.isArray(advertisement.tags) 
          ? advertisement.tags.join(',') 
          : advertisement.tags || '',
        isFeatured: advertisement.isFeatured || false,
        order: advertisement.order?.toString() || '0',
      });
      setVideoUrl(advertisement.videoUrl || '');
      if (advertisement.coverImage) {
        setPreviewCover(getImageUrl(advertisement.coverImage));
      }
      if (advertisement.clientLogo) {
        setPreviewLogo(getImageUrl(advertisement.clientLogo));
      }
    }
  }, [advertisement]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'cover') {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewCover(reader.result);
      reader.readAsDataURL(file);
    } else if (type === 'logo') {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewLogo(reader.result);
      reader.readAsDataURL(file);
    } else if (type === 'video') {
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);
    setIsUploading(false);

    try {
      // Validate required fields
      if (!formData.title) {
        throw new Error('Title is required');
      }
      if (!coverFile && !advertisement) {
        throw new Error('Cover image is required');
      }
      if (!videoFile && !videoUrl && !advertisement?.videoPath && !advertisement?.videoUrl) {
        throw new Error('Either video file or video URL is required');
      }

      const submitFormData = new FormData();
      
      // Required fields
      submitFormData.append('title', formData.title);
      if (coverFile) {
        submitFormData.append('cover', coverFile);
      }

      // Video (either file or URL)
      if (videoFile) {
        submitFormData.append('video', videoFile);
        setIsUploading(true); // Show progress only if uploading a video file
      } else if (videoUrl) {
        submitFormData.append('videoUrl', videoUrl);
      }

      // Optional fields
      if (formData.titleAr) submitFormData.append('titleAr', formData.titleAr);
      if (formData.description) submitFormData.append('description', formData.description);
      if (formData.descriptionAr) submitFormData.append('descriptionAr', formData.descriptionAr);
      if (formData.clientName) submitFormData.append('clientName', formData.clientName);
      if (formData.category) submitFormData.append('category', formData.category);
      if (formData.tags) submitFormData.append('tags', formData.tags);
      if (logoFile) submitFormData.append('logo', logoFile);
      
      submitFormData.append('isFeatured', formData.isFeatured ? 'true' : 'false');
      submitFormData.append('order', formData.order);

      if (advertisement) {
        // Update existing with progress tracking
        await advertisementsAPI.update(advertisement._id, submitFormData, (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
      } else {
        // Create new with progress tracking
        await advertisementsAPI.create(submitFormData, (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
      }

      setUploadProgress(100);
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err) {
      console.error('Error submitting advertisement:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save advertisement');
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{advertisement ? 'Edit Advertisement' : 'Upload New Video'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="ad-form">
          {error && (
            <div className="error-alert">
              <span>{error}</span>
            </div>
          )}

          <div className="form-section">
            <h4>Basic Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Title (Arabic)</label>
                <input
                  type="text"
                  value={formData.titleAr}
                  onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Description (Arabic)</label>
              <textarea
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Media Files</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Cover Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'cover')}
                  required={!advertisement}
                />
                {previewCover && (
                  <img src={previewCover} alt="Cover preview" className="preview-image" />
                )}
              </div>
              <div className="form-group">
                <label>Client Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'logo')}
                />
                {previewLogo && (
                  <img src={previewLogo} alt="Logo preview" className="preview-image" />
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Video</h4>
            <div className="form-group">
              <label>Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, 'video')}
                disabled={!!videoUrl}
              />
              <p className="form-hint">Upload MP4, MOV, AVI, or WebM file</p>
            </div>
            <div className="form-group">
              <label>OR Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  if (e.target.value) setVideoFile(null);
                }}
                placeholder="https://youtube.com/watch?v=xxx"
                disabled={!!videoFile}
              />
              <p className="form-hint">External video URL (YouTube, Vimeo, etc.)</p>
            </div>
          </div>

          <div className="form-section">
            <h4>Additional Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="production">Production</option>
                  <option value="advertising">Advertising</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
              <p className="form-hint">Comma-separated tags</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  <span>Featured</span>
                </label>
              </div>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="upload-progress-container">
              <div className="upload-progress-header">
                <span>Uploading video...</span>
                <span className="upload-progress-percent">{uploadProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="upload-progress-hint">
                Please wait while your video is being uploaded. Do not close this window.
              </p>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isUploading}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading || isUploading}>
              {isUploading ? `Uploading... ${uploadProgress}%` : loading ? 'Saving...' : advertisement ? 'Update' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Advertisements;

