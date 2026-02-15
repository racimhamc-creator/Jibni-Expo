import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, X, Save, Upload } from 'lucide-react';
import { shootingArtistsAPI } from '../../services/api';
import './ShootingArtists.css';

const ShootingArtists = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayOrder: 0,
    isActive: true,
    photos: [],
  });
  const [newPhotos, setNewPhotos] = useState([]);
  const [photosToRemove, setPhotosToRemove] = useState([]);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const response = await shootingArtistsAPI.getAll();
      setArtists(response.data.artists || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur lors du chargement des artistes';
      console.error('Full error:', error.response?.data || error);
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (artist = null) => {
    if (artist) {
      setEditingArtist(artist);
      setFormData({
        name: artist.name || '',
        displayOrder: artist.displayOrder || 0,
        isActive: artist.isActive !== undefined ? artist.isActive : true,
        photos: artist.photos || [],
      });
      setNewPhotos([]);
      setPhotosToRemove([]);
    } else {
      setEditingArtist(null);
      setFormData({
        name: '',
        displayOrder: 0,
        isActive: true,
        photos: [],
      });
      setNewPhotos([]);
      setPhotosToRemove([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingArtist(null);
    setFormData({
      name: '',
      displayOrder: 0,
      isActive: true,
      photos: [],
    });
    setNewPhotos([]);
    setPhotosToRemove([]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewPhotos([...newPhotos, ...files]);
  };

  const handleRemoveNewPhoto = (index) => {
    setNewPhotos(newPhotos.filter((_, i) => index !== i));
  };

  const handleRemoveExistingPhoto = (photoUrl) => {
    setPhotosToRemove([...photosToRemove, photoUrl]);
    setFormData({
      ...formData,
      photos: formData.photos.filter(p => p !== photoUrl),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Le nom de l\'artiste est requis');
      return;
    }

    // Validate photos for new artists
    if (!editingArtist && newPhotos.length === 0) {
      alert('Veuillez ajouter au moins une photo pour créer un artiste');
      return;
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append('name', formData.name);
      submitFormData.append('displayOrder', formData.displayOrder.toString());
      submitFormData.append('isActive', formData.isActive.toString());
      
      if (editingArtist) {
        // Update existing artist
        submitFormData.append('existingPhotos', JSON.stringify(formData.photos));
        if (photosToRemove.length > 0) {
          submitFormData.append('removePhotos', JSON.stringify(photosToRemove));
        }
        
        // Add new photos
        newPhotos.forEach(photo => {
          submitFormData.append('photos', photo);
        });
        
        await shootingArtistsAPI.update(editingArtist._id, submitFormData);
        alert('Artiste mis à jour avec succès');
      } else {
        // Create new artist
        newPhotos.forEach(photo => {
          submitFormData.append('photos', photo);
        });
        
        console.log('🚀 Submitting new artist with', newPhotos.length, 'photos');
        console.log('🚀 FormData size check:', submitFormData);
        
        const response = await shootingArtistsAPI.create(submitFormData);
        console.log('✅ Response received:', response);
        alert('Artiste créé avec succès');
      }
      
      handleCloseModal();
      fetchArtists();
    } catch (error) {
      console.error('Error saving artist:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur lors de la sauvegarde de l\'artiste';
      alert(`Erreur: ${errorMessage}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet artiste ?')) {
      return;
    }

    try {
      await shootingArtistsAPI.delete(id);
      alert('Artiste supprimé avec succès');
      fetchArtists();
    } catch (error) {
      console.error('Error deleting artist:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur lors de la suppression de l\'artiste';
      alert(`Erreur: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="shooting-artists-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shooting-artists-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Gestion des Artistes Shooting</h2>
          <p>Gérez les artistes et leurs photos circulaires</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Ajouter un artiste
        </button>
      </div>

      <div className="artists-grid">
        {artists.length === 0 ? (
          <div className="empty-state">
            <ImageIcon size={48} />
            <p>Aucun artiste pour le moment</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              Ajouter le premier artiste
            </button>
          </div>
        ) : (
          artists.map((artist) => (
            <div key={artist._id} className={`artist-card ${!artist.isActive ? 'inactive' : ''}`}>
              <div className="artist-card-header">
                <h3>{artist.name}</h3>
                <div className="artist-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleOpenModal(artist)}
                    title="Modifier">
                    <Edit size={16} />
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(artist._id)}
                    title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="artist-photos-preview">
                {artist.photos && artist.photos.length > 0 ? (
                  <div className="photos-grid">
                    {artist.photos.slice(0, 4).map((photo, index) => (
                      <div key={index} className="photo-thumbnail">
                        <img src={photo} alt={`Photo ${index + 1}`} />
                      </div>
                    ))}
                    {artist.photos.length > 4 && (
                      <div className="photo-thumbnail more-photos">
                        +{artist.photos.length - 4}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-photos">
                    <ImageIcon size={24} />
                    <p>Aucune photo</p>
                  </div>
                )}
              </div>
              
              <div className="artist-card-footer">
                <span className="badge">Ordre: {artist.displayOrder}</span>
                <span className={`status-badge ${artist.isActive ? 'active' : 'inactive'}`}>
                  {artist.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingArtist ? 'Modifier l\'artiste' : 'Nouvel artiste'}</h3>
              <button className="btn-icon" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="artist-form">
              <div className="form-group">
                <label>Nom de l'artiste *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Sarah Johnson"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ordre d'affichage</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  <small>Les nombres plus petits apparaissent en premier</small>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Actif
                  </label>
                </div>
              </div>

              {/* Existing Photos */}
              {editingArtist && formData.photos.length > 0 && (
                <div className="form-group">
                  <label>Photos existantes</label>
                  <div className="existing-photos-grid">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="existing-photo-item">
                        <img src={photo} alt={`Photo ${index + 1}`} />
                        <button
                          type="button"
                          className="btn-remove-photo"
                          onClick={() => handleRemoveExistingPhoto(photo)}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Photos */}
              <div className="form-group">
                <label>
                  {editingArtist ? 'Ajouter des photos' : 'Photos *'}
                </label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="photo-upload"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="photo-upload" className="file-upload-label">
                    <Upload size={20} />
                    <span>Sélectionner des photos</span>
                  </label>
                  {newPhotos.length > 0 && (
                    <div className="new-photos-preview">
                      {newPhotos.map((photo, index) => (
                        <div key={index} className="new-photo-item">
                          <img src={URL.createObjectURL(photo)} alt={`Nouvelle photo ${index + 1}`} />
                          <button
                            type="button"
                            className="btn-remove-photo"
                            onClick={() => handleRemoveNewPhoto(index)}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <small>Vous pouvez sélectionner plusieurs photos (max 20)</small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={18} />
                  {editingArtist ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShootingArtists;
