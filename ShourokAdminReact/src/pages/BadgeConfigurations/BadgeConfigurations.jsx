import { useState, useEffect } from 'react';
import { Eye, Shield, Edit, Trash2, Plus, X, GripVertical } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { badgeConfigurationsAPI } from '../../services/api';
import './BadgeConfigurations.css';

const BadgeConfigurations = () => {
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    fahras: '',
    badges: [],
  });

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await badgeConfigurationsAPI.getAll();
      setConfigurations(response.data.configurations || []);
    } catch (error) {
      console.error('Error fetching badge configurations:', error);
      setConfigurations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      fahras: '',
      badges: [],
    });
    setEditingConfig(null);
    setShowAddModal(true);
  };

  const handleEdit = (config) => {
    setFormData({
      fahras: config.fahras,
      badges: config.badges || [],
    });
    setEditingConfig(config);
    setShowAddModal(true);
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this badge configuration?')) {
      return;
    }

    try {
      await badgeConfigurationsAPI.delete(configId);
      fetchConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('Failed to delete badge configuration');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fahras || formData.badges.length === 0) {
      alert('فهرس and at least one badge are required');
      return;
    }

    try {
      if (editingConfig) {
        await badgeConfigurationsAPI.update(editingConfig._id, formData);
      } else {
        await badgeConfigurationsAPI.create(formData);
      }
      setShowAddModal(false);
      fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(error.response?.data?.message || 'Failed to save badge configuration');
    }
  };

  const addBadge = () => {
    const badgeNumber = formData.badges.length + 1;
    setFormData({
      ...formData,
      badges: [
        ...formData.badges,
        {
          badgeNumber,
          fields: [],
          isActive: true,
        },
      ],
    });
  };

  const removeBadge = (badgeIndex) => {
    setFormData({
      ...formData,
      badges: formData.badges.filter((_, index) => index !== badgeIndex),
    });
  };

  const addField = (badgeIndex) => {
    const updatedBadges = [...formData.badges];
    updatedBadges[badgeIndex].fields.push({
      name: '',
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      order: updatedBadges[badgeIndex].fields.length,
    });
    setFormData({ ...formData, badges: updatedBadges });
  };

  const removeField = (badgeIndex, fieldIndex) => {
    const updatedBadges = [...formData.badges];
    updatedBadges[badgeIndex].fields = updatedBadges[badgeIndex].fields.filter(
      (_, index) => index !== fieldIndex
    );
    setFormData({ ...formData, badges: updatedBadges });
  };

  const updateField = (badgeIndex, fieldIndex, fieldData) => {
    const updatedBadges = [...formData.badges];
    updatedBadges[badgeIndex].fields[fieldIndex] = {
      ...updatedBadges[badgeIndex].fields[fieldIndex],
      ...fieldData,
    };
    setFormData({ ...formData, badges: updatedBadges });
  };

  const columns = [
    {
      header: 'فهرس',
      accessor: 'fahras',
      render: (row) => (
        <div className="fahras-cell">
          <Shield size={14} />
          <span className="fahras-badge">{row.fahras || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Badges',
      accessor: 'badges',
      render: (row) => (
        <span>{row.badges?.length || 0} badge(s)</span>
      )
    },
    {
      header: 'Total Fields',
      accessor: 'totalFields',
      render: (row) => {
        const totalFields = row.badges?.reduce((sum, badge) => sum + (badge.fields?.length || 0), 0) || 0;
        return <span>{totalFields} field(s)</span>;
      }
    },
    {
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <div className="actions-cell">
          <button 
            className="action-btn"
            onClick={() => setSelectedConfig(row)}
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
    <div className="badge-configurations-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Badge Configurations</h2>
          <p>Manage badge field structures for each فهرس number</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            Add Configuration
          </button>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{configurations.length}</span>
            <span className="stat-label">Configurations</span>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={configurations}
        loading={loading}
        emptyMessage="No badge configurations found"
      />

      {/* Configuration Detail Modal */}
      {selectedConfig && (
        <div className="modal-overlay" onClick={() => setSelectedConfig(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Badge Configuration Details - فهرس {selectedConfig.fahras}</h3>
              <button className="close-btn" onClick={() => setSelectedConfig(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="badges-list">
                {selectedConfig.badges?.map((badge, badgeIndex) => (
                  <div key={badgeIndex} className="badge-item">
                    <h4>Badge {badge.badgeNumber}</h4>
                    <div className="fields-list">
                      {badge.fields?.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="field-item">
                          <div className="field-header">
                            <span className="field-name">{field.label || field.name}</span>
                            <span className="field-type">{field.type}</span>
                            {field.required && <span className="required-badge">Required</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingConfig ? 'Edit Badge Configuration' : 'Add New Badge Configuration'}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>فهرس (Index) Number *</label>
                <input
                  type="number"
                  value={formData.fahras}
                  onChange={(e) => setFormData({ ...formData, fahras: parseInt(e.target.value) || '' })}
                  required
                  min="1"
                  placeholder="2"
                  disabled={!!editingConfig}
                />
                {editingConfig && <small>فهرس cannot be changed after creation</small>}
              </div>

              <div className="badges-section">
                <div className="section-header">
                  <h4>Badges</h4>
                  <button type="button" className="btn-secondary btn-small" onClick={addBadge}>
                    <Plus size={14} />
                    Add Badge
                  </button>
                </div>

                {formData.badges.map((badge, badgeIndex) => (
                  <div key={badgeIndex} className="badge-config">
                    <div className="badge-config-header">
                      <h5>Badge {badge.badgeNumber}</h5>
                      {formData.badges.length > 1 && (
                        <button
                          type="button"
                          className="btn-danger btn-small"
                          onClick={() => removeBadge(badgeIndex)}
                        >
                          <X size={14} />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="fields-section">
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

                      {badge.fields.map((field, fieldIndex) => (
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeConfigurations;

