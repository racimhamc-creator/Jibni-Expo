import React, { useState, useEffect, useRef } from 'react';
import { splashAdsAPI } from '../../services/api';
import './SplashAds.css';

const SplashAds = () => {
  const [splashAds, setSplashAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [formData, setFormData] = useState({
    isActive: true,
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSplashAds();
  }, []);

  const fetchSplashAds = async () => {
    try {
      setLoading(true);
      const response = await splashAdsAPI.getAll();
      setSplashAds(response.data.splashAds || []);
    } catch (error) {
      console.error('Error fetching splash ads:', error);
      alert('Error loading splash ads: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      isActive: true,
      image: null
    });
    setImagePreview(null);
    setEditingAd(null);
    setShowCreateForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      alert('Please select an image');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formDataToSend = new FormData();
      formDataToSend.append('image', formData.image);
      formDataToSend.append('isActive', formData.isActive.toString());

      await splashAdsAPI.create(formDataToSend, (progress) => {
        setUploadProgress(Math.round((progress.loaded * 100) / progress.total));
      });

      alert('Splash ad created successfully!');
      resetForm();
      fetchSplashAds();
    } catch (error) {
      console.error('Error creating splash ad:', error);
      alert('Error creating splash ad: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      isActive: ad.isActive,
      image: null
    });
    setImagePreview(ad.imageUrl);
    setShowCreateForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setUploading(true);
      setUploadProgress(0);

      const formDataToSend = new FormData();
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      formDataToSend.append('isActive', formData.isActive.toString());

      await splashAdsAPI.update(editingAd._id, formDataToSend, (progress) => {
        setUploadProgress(Math.round((progress.loaded * 100) / progress.total));
      });

      alert('Splash ad updated successfully!');
      resetForm();
      fetchSplashAds();
    } catch (error) {
      console.error('Error updating splash ad:', error);
      alert('Error updating splash ad: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this splash ad?')) {
      return;
    }

    try {
      await splashAdsAPI.delete(adId);
      alert('Splash ad deleted successfully!');
      fetchSplashAds();
    } catch (error) {
      console.error('Error deleting splash ad:', error);
      alert('Error deleting splash ad: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleActive = async (adId) => {
    try {
      await splashAdsAPI.toggle(adId);
      fetchSplashAds();
    } catch (error) {
      console.error('Error toggling splash ad:', error);
      alert('Error toggling splash ad: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="splash-ads">
        <div className="loading">Loading splash ads...</div>
      </div>
    );
  }

  return (
    <div className="splash-ads">
      <div className="splash-ads-header">
        <h1>Splash Ads Management</h1>
        <p>Manage advertisement images shown to users during authentication</p>
        <button
          className="create-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Add New Splash Ad'}
        </button>
      </div>

      {showCreateForm && (
        <div className="form-container">
          <form onSubmit={editingAd ? handleUpdate : handleCreate} className="splash-ad-form">
            <h3>{editingAd ? 'Edit Splash Ad' : 'Upload New Splash Ad'}</h3>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                Active (visible to users)
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="image">Image</label>
              <input
                type="file"
                id="image"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                required={!editingAd}
              />
              <small>Recommended: 1080x1920px (mobile aspect ratio), PNG/JPG/WebP</small>
            </div>

            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" disabled={uploading} className="submit-btn">
                {uploading ? `Uploading... ${uploadProgress}%` : (editingAd ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="splash-ads-grid">
        {splashAds.length === 0 ? (
          <div className="no-ads">
            <p>No splash ads found. Create your first one!</p>
          </div>
        ) : (
          splashAds.map((ad) => (
            <div key={ad._id} className={`splash-ad-card ${!ad.isActive ? 'inactive' : ''}`}>
              <div className="ad-image">
                <img src={ad.imageUrl} alt={ad.title || 'Splash Ad'} />
                <div className="ad-overlay">
                  <span className="order-badge">#{ad.order}</span>
                  {!ad.isActive && <span className="inactive-badge">Inactive</span>}
                </div>
              </div>

              <div className="ad-info">
                <p>Status: {ad.isActive ? 'Active' : 'Inactive'}</p>
                <p>Uploaded: {new Date(ad.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="ad-actions">
                <button
                  onClick={() => handleToggleActive(ad._id)}
                  className={`toggle-btn ${ad.isActive ? 'deactivate' : 'activate'}`}
                >
                  {ad.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleEdit(ad)} className="edit-btn">
                  Edit
                </button>
                <button onClick={() => handleDelete(ad._id)} className="delete-btn">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SplashAds;