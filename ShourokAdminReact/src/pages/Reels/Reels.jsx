import { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, Video, Play, Filter } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import api from '../../services/api';
import './Reels.css';

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reels');
      setReels(response.data.reels || []);
    } catch (error) {
      console.error('Error fetching reels:', error);
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this reel?')) {
      try {
        await api.delete(`/reels/${id}`);
        fetchReels();
      } catch (error) {
        console.error('Error deleting reel:', error);
        alert('Failed to delete reel');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (reels.length === 0) {
      alert('No reels to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ALL ${reels.length} reel(s)? This action cannot be undone!`;
    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.delete('/reels');
        alert(`Successfully deleted ${response.data.deletedCount} reel(s)`);
        fetchReels();
      } catch (error) {
        console.error('Error deleting all reels:', error);
        alert('Failed to delete all reels');
      }
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseURL = api.defaults.baseURL.replace('/api', '');
    return `${baseURL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const columns = [
    {
      header: 'Video',
      render: (row) => (
        <div className="video-cell">
          <div className="video-thumb">
            {row.thumbnail ? (
              <img src={getImageUrl(row.thumbnail)} alt={row.title || 'Reel'} />
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
            <span className="video-title">{row.title || 'Untitled Reel'}</span>
            {row.description && (
              <span className="video-description">{row.description.substring(0, 50)}...</span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'User',
      render: (row) => (
        <div className="user-cell">
          {row.userId?.profileImage && (
            <img 
              src={getImageUrl(row.userId.profileImage)} 
              alt={row.userId.username}
              className="user-avatar"
            />
          )}
          <span>{row.userId?.username || 'Unknown'}</span>
        </div>
      )
    },
    {
      header: 'Stats',
      width: '150px',
      render: (row) => (
        <div className="stats-cell">
          <div className="stat-item">
            <span className="stat-label">Likes:</span>
            <span className="stat-value">{row.likesCount || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Comments:</span>
            <span className="stat-value">{row.commentsCount || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Views:</span>
            <span className="stat-value">{row.views || 0}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      width: '100px',
      render: (row) => (
        <span className={`status-badge status-badge--${row.isActive ? 'active' : 'inactive'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
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
              setSelectedReel(row);
              setShowModal(true);
            }}
            title="View"
          >
            <Eye size={16} />
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
    <div className="reels-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Reels</h2>
          <p>Manage user-uploaded reels ({reels.length} total)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {reels.length > 0 && (
            <button 
              className="secondary-btn" 
              onClick={handleDeleteAll}
              style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
            >
              <Trash2 size={18} />
              <span>Delete All ({reels.length})</span>
            </button>
          )}
          <button className="primary-btn" onClick={() => {
            setSelectedReel(null);
            setShowModal(true);
          }}>
            <Plus size={18} />
            <span>Upload Reel (ShoroukEvent)</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={reels}
        loading={loading}
        emptyMessage="No reels found. Upload your first reel!"
      />

      {/* Upload/View Modal */}
      {showModal && (
        <ReelModal
          reel={selectedReel}
          onClose={() => {
            setShowModal(false);
            setSelectedReel(null);
          }}
          onSuccess={() => {
            fetchReels();
            setShowModal(false);
            setSelectedReel(null);
          }}
        />
      )}
    </div>
  );
};

// Upload/View Modal Component
const ReelModal = ({ reel, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewThumbnail, setPreviewThumbnail] = useState(null);
  const [isShoroukEvent, setIsShoroukEvent] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({
    video: 0,
    thumbnail: 0,
  });
  const [currentUploadStep, setCurrentUploadStep] = useState('');

  useEffect(() => {
    if (reel) {
      setFormData({
        title: reel.title || '',
        description: reel.description || '',
      });
      setVideoUrl(reel.videoUrl || '');
      if (reel.thumbnail) {
        const baseURL = api.defaults.baseURL.replace('/api', '');
        setPreviewThumbnail(`${baseURL}${reel.thumbnail.startsWith('/') ? '' : '/'}${reel.thumbnail}`);
      }
    }
  }, [reel]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'thumbnail') {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewThumbnail(reader.result);
      reader.readAsDataURL(file);
    } else if (type === 'video') {
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress({ video: 0, thumbnail: 0 });
    setCurrentUploadStep('');

    try {
      if (!videoFile && !videoUrl) {
        throw new Error('Video file or URL is required');
      }

      let videoPath = '';
      let thumbnailPath = '';

      // Upload video if provided
      if (videoFile) {
        setCurrentUploadStep('Uploading video...');
        const videoFormData = new FormData();
        videoFormData.append('video', videoFile);
        const videoResponse = await api.post('/reels/upload/video', videoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, video: percentCompleted }));
          },
        });
        videoPath = videoResponse.data.video.path;
      }

      // Upload thumbnail if provided (optional)
      if (thumbnailFile) {
        setCurrentUploadStep('Uploading thumbnail...');
        const thumbFormData = new FormData();
        thumbFormData.append('thumbnail', thumbnailFile);
        const thumbResponse = await api.post('/reels/upload/thumbnail', thumbFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, thumbnail: percentCompleted }));
          },
        });
        thumbnailPath = thumbResponse.data.thumbnail.path;
      }

      // Create reel - backend will automatically find or create ShoroukEvent user
      const reelData = {
        userId: 'SHOROUK_EVENT_USER_ID', // Backend will handle this
        videoPath: videoPath || reel?.videoPath || '',
        videoUrl: videoUrl || '',
        thumbnail: thumbnailPath || '', // Optional
        title: formData.title || '',
        description: formData.description || '',
      };

      await api.post('/reels', reelData);

      setCurrentUploadStep('Creating reel...');
      await api.post('/reels', reelData);

      alert('Reel uploaded successfully!');
      onSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || error.message || 'Error uploading reel');
    } finally {
      setLoading(false);
      setUploadProgress({ video: 0, thumbnail: 0 });
      setCurrentUploadStep('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{reel ? 'View Reel' : 'Upload Reel (ShoroukEvent)'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {reel ? (
          <div className="reel-view">
            {reel.videoPath && (
              <video 
                src={api.defaults.baseURL.replace('/api', '') + reel.videoPath}
                controls
                style={{ width: '100%', maxHeight: '400px' }}
              />
            )}
            <div className="reel-info">
              <h4>{reel.title || 'Untitled'}</h4>
              <p>{reel.description || 'No description'}</p>
              <div className="reel-stats">
                <span>Likes: {reel.likesCount || 0}</span>
                <span>Comments: {reel.commentsCount || 0}</span>
                <span>Views: {reel.views || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="reel-form">
            {error && <div className="error-message">{error}</div>}

            {/* Upload Progress */}
            {loading && (
              <div className="upload-progress">
                <div className="progress-header">
                  <span className="progress-text">
                    {currentUploadStep || 'Preparing upload...'}
                  </span>
                </div>

                {uploadProgress.video > 0 && (
                  <div className="progress-item">
                    <span className="progress-label">Video Upload</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress.video}%` }}
                      />
                    </div>
                    <span className="progress-percent">{uploadProgress.video}%</span>
                  </div>
                )}

                {uploadProgress.thumbnail > 0 && (
                  <div className="progress-item">
                    <span className="progress-label">Thumbnail Upload</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress.thumbnail}%` }}
                      />
                    </div>
                    <span className="progress-percent">{uploadProgress.thumbnail}%</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter reel title"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter reel description"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, 'video')}
              />
              {videoFile && <p className="file-name">{videoFile.name}</p>}
            </div>

            <div className="form-group">
              <label>OR Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>Thumbnail (Optional)</label>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {videoFile ? 'A thumbnail will be automatically generated from the video if not provided.' : 'Upload a custom thumbnail, or one will be auto-generated from the video.'}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'thumbnail')}
              />
              {previewThumbnail && (
                <img src={previewThumbnail} alt="Thumbnail preview" className="thumbnail-preview" />
              )}
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="secondary-btn">
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Uploading...' : 'Upload Reel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Reels;

