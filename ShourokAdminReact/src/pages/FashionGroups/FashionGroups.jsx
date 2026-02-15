import { useState, useEffect } from 'react';
import { Users, Check, X, Plus, Trash2, Save } from 'lucide-react';
import { fashionGroupsAPI, castingAPI } from '../../services/api';
import './FashionGroups.css';

const FashionGroups = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [allCastings, setAllCastings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState([]);

  useEffect(() => {
    fetchGroups();
    fetchAllCastings();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fashionGroupsAPI.getAll();
      setGroups(response.data.groups || []);
      
      // Initialize groups if they don't exist
      if (response.data.groups.length === 0) {
        console.log('No groups found. Please run the initialization script.');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCastings = async () => {
    try {
      // Fetch all castings without status filter
      const response = await castingAPI.getApplications({ limit: 1000, page: 1 });
      const castings = response.data.applications || response.data || [];
      setAllCastings(castings);
    } catch (error) {
      console.error('Error fetching castings:', error);
      // Fallback: try using fashion groups API
      try {
        const fallbackResponse = await fashionGroupsAPI.getAllCastings();
        setAllCastings(fallbackResponse.data.castings || []);
      } catch (fallbackError) {
        console.error('Error with fallback API:', fallbackError);
      }
    }
  };

  const handleGroupSelect = async (group) => {
    setSelectedGroup(group);
    try {
      const response = await fashionGroupsAPI.getGroup(group.groupName);
      setSelectedModelIds(response.data.models.map(m => m._id));
    } catch (error) {
      console.error('Error fetching group models:', error);
      setSelectedModelIds([]);
    }
  };

  const toggleModelSelection = (modelId) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        if (prev.length >= 10) {
          alert('Maximum 10 models per group allowed');
          return prev;
        }
        return [...prev, modelId];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedGroup) return;
    
    if (selectedModelIds.length > 10) {
      alert('Cannot have more than 10 models in a group');
      return;
    }

    try {
      setSaving(true);
      await fashionGroupsAPI.updateGroup(selectedGroup.groupName, {
        modelIds: selectedModelIds,
        displayName: selectedGroup.displayName,
        isActive: selectedGroup.isActive,
      });
      alert('Group updated successfully!');
      fetchGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Error saving group: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fashion-groups-container">
        <div className="loading-state">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="fashion-groups-container">
      <div className="fashion-groups-header">
        <h1>Fashion Show Groups</h1>
        <p>Manage models for each fashion show group (max 10 models per group)</p>
      </div>

      <div className="fashion-groups-content">
        {/* Groups List */}
        <div className="groups-sidebar">
          <h2>Groups</h2>
          {groups.length === 0 ? (
            <div className="no-groups-message">
              <p>No groups found. Please initialize groups first.</p>
              <p className="help-text">Run: <code>node Backend/scripts/initializeFashionGroups.js</code></p>
            </div>
          ) : (
            groups.map((group) => (
            <div
              key={group._id}
              className={`group-card ${selectedGroup?._id === group._id ? 'active' : ''}`}
              onClick={() => handleGroupSelect(group)}>
              <div className="group-card-header">
                <Users size={20} />
                <span className="group-name">{group.displayName || `Group ${group.groupName}`}</span>
              </div>
              <div className="group-card-stats">
                <span>{group.modelCount || 0} / 10 models</span>
                {group.isActive ? (
                  <span className="status-badge active">Active</span>
                ) : (
                  <span className="status-badge inactive">Inactive</span>
                )}
              </div>
            </div>
            ))
          )}
        </div>

        {/* Models Selection */}
        {selectedGroup && (
          <div className="models-selection">
            <div className="models-selection-header">
              <h2>Select Models for {selectedGroup.displayName || `Group ${selectedGroup.groupName}`}</h2>
              <div className="selection-info">
                <span>{selectedModelIds.length} / 10 selected</span>
                <button
                  className="save-button"
                  onClick={handleSave}
                  disabled={saving || selectedModelIds.length === 0}>
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Group'}
                </button>
              </div>
            </div>

            <div className="castings-grid">
              {allCastings.map((casting) => {
                const isSelected = selectedModelIds.includes(casting._id);
                return (
                  <div
                    key={casting._id}
                    className={`casting-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleModelSelection(casting._id)}>
                    <div className="casting-card-image">
                      {casting.facePhoto ? (
                        <img src={casting.facePhoto} alt={casting.fullName} />
                      ) : (
                        <div className="no-image">No Photo</div>
                      )}
                      {isSelected && (
                        <div className="selected-badge">
                          <Check size={20} />
                        </div>
                      )}
                    </div>
                    <div className="casting-card-info">
                      <h3>{casting.fullName}</h3>
                      {casting.status && (
                        <span className={`status-badge status-${casting.status}`}>
                          {casting.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!selectedGroup && (
          <div className="no-selection">
            <Users size={48} />
            <p>Select a group to manage its models</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FashionGroups;
