import { useState, useEffect } from 'react';
import { Save, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import './AppVersion.css';

const AppVersion = () => {
  const [versions, setVersions] = useState({
    ios: null,
    android: null,
  });
  const [currentVersions, setCurrentVersions] = useState({
    ios: { version: 'N/A', buildNumber: 'N/A' },
    android: { version: 'N/A', versionCode: 'N/A' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchVersions();
    fetchCurrentVersions();
  }, []);

  const fetchCurrentVersions = async () => {
    try {
      const response = await api.get('/admin/app-version/current');
      if (response.data.success) {
        setCurrentVersions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching current app versions:', error);
    }
  };

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/app-version');
      if (response.data.success) {
        const iosVersion = response.data.data.find(v => v.platform === 'ios');
        const androidVersion = response.data.data.find(v => v.platform === 'android');
        setVersions({
          ios: iosVersion || {
            platform: 'ios',
            minimumVersion: '3.0.4',
            minimumVersionCode: 8,
            appStoreUrl: 'https://apps.apple.com/us/app/shorouk-event/id6757281766',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.shourokapp.app',
            isBlocking: true,
            updateMessage: 'A new version of the app is available. Please update to continue.',
            updateMessageAr: 'إصدار جديد من التطبيق متاح. يرجى التحديث للمتابعة.',
            updateMessageFr: 'Une nouvelle version de l\'application est disponible. Veuillez mettre à jour pour continuer.',
          },
          android: androidVersion || {
            platform: 'android',
            minimumVersion: '3.0.4',
            minimumVersionCode: 21,
            appStoreUrl: 'https://apps.apple.com/us/app/shorouk-event/id6757281766',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.shourokapp.app',
            isBlocking: true,
            updateMessage: 'A new version of the app is available. Please update to continue.',
            updateMessageAr: 'إصدار جديد من التطبيق متاح. يرجى التحديث للمتابعة.',
            updateMessageFr: 'Une nouvelle version de l\'application est disponible. Veuillez mettre à jour pour continuer.',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      setMessage({ type: 'error', text: 'Failed to load version configurations' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (platform) => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const version = versions[platform];
      
      const response = await api.put(`/admin/app-version/${platform}`, {
        minimumVersion: version.minimumVersion,
        minimumVersionCode: version.minimumVersionCode,
        appStoreUrl: version.appStoreUrl,
        playStoreUrl: version.playStoreUrl,
        isBlocking: version.isBlocking,
        updateMessage: version.updateMessage,
        updateMessageAr: version.updateMessageAr,
        updateMessageFr: version.updateMessageFr,
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: `${platform.toUpperCase()} version configuration saved successfully!` });
        await fetchVersions();
      }
    } catch (error) {
      console.error('Error saving version:', error);
      setMessage({ type: 'error', text: `Failed to save ${platform} configuration` });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (platform, field, value) => {
    setVersions(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="app-version-page">
        <div className="loading-container">
          <p>Loading version configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-version-page">
      <div className="page-header">
        <div className="header-info">
          <h2>App Version Control</h2>
          <p>Manage minimum required app versions and update messages</p>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="version-configs">
        {/* iOS Configuration */}
        <div className="version-card">
          <div className="version-card-header">
            <Smartphone size={24} />
            <h3>iOS Configuration</h3>
          </div>
          <div className="current-version-info">
            <div className="current-version-item">
              <span className="current-version-label">Current App Version:</span>
              <span className="current-version-value">{currentVersions.ios.version}</span>
            </div>
            <div className="current-version-item">
              <span className="current-version-label">Current Build Number:</span>
              <span className="current-version-value">{currentVersions.ios.buildNumber}</span>
            </div>
          </div>
          <div className="version-form">
            <div className="form-group">
              <label>Minimum Version (e.g., 3.0.4)</label>
              <input
                type="text"
                value={versions.ios?.minimumVersion || ''}
                onChange={(e) => handleChange('ios', 'minimumVersion', e.target.value)}
                placeholder="3.0.4"
              />
            </div>
            <div className="form-group">
              <label>Minimum Build Number</label>
              <input
                type="number"
                value={versions.ios?.minimumVersionCode || ''}
                onChange={(e) => handleChange('ios', 'minimumVersionCode', parseInt(e.target.value))}
                placeholder="8"
              />
            </div>
            <div className="form-group">
              <label>App Store URL</label>
              <input
                type="url"
                value={versions.ios?.appStoreUrl || ''}
                onChange={(e) => handleChange('ios', 'appStoreUrl', e.target.value)}
                placeholder="https://apps.apple.com/app/id..."
              />
            </div>
            <div className="form-group">
              <label>Play Store URL (for reference)</label>
              <input
                type="url"
                value={versions.ios?.playStoreUrl || ''}
                onChange={(e) => handleChange('ios', 'playStoreUrl', e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={versions.ios?.isBlocking || false}
                  onChange={(e) => handleChange('ios', 'isBlocking', e.target.checked)}
                />
                <span>Block app access if version is outdated</span>
              </label>
            </div>
            <div className="form-group">
              <label>Update Message (English)</label>
              <textarea
                value={versions.ios?.updateMessage || ''}
                onChange={(e) => handleChange('ios', 'updateMessage', e.target.value)}
                rows={3}
                placeholder="A new version of the app is available. Please update to continue."
              />
            </div>
            <div className="form-group">
              <label>Update Message (Arabic)</label>
              <textarea
                value={versions.ios?.updateMessageAr || ''}
                onChange={(e) => handleChange('ios', 'updateMessageAr', e.target.value)}
                rows={3}
                placeholder="إصدار جديد من التطبيق متاح. يرجى التحديث للمتابعة."
              />
            </div>
            <div className="form-group">
              <label>Update Message (French)</label>
              <textarea
                value={versions.ios?.updateMessageFr || ''}
                onChange={(e) => handleChange('ios', 'updateMessageFr', e.target.value)}
                rows={3}
                placeholder="Une nouvelle version de l'application est disponible. Veuillez mettre à jour pour continuer."
              />
            </div>
            <button
              className="save-btn"
              onClick={() => handleSave('ios')}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save iOS Configuration'}
            </button>
          </div>
        </div>

        {/* Android Configuration */}
        <div className="version-card">
          <div className="version-card-header">
            <Smartphone size={24} />
            <h3>Android Configuration</h3>
          </div>
          <div className="current-version-info">
            <div className="current-version-item">
              <span className="current-version-label">Current App Version:</span>
              <span className="current-version-value">{currentVersions.android.version}</span>
            </div>
            <div className="current-version-item">
              <span className="current-version-label">Current Version Code:</span>
              <span className="current-version-value">{currentVersions.android.versionCode}</span>
            </div>
          </div>
          <div className="version-form">
            <div className="form-group">
              <label>Minimum Version (e.g., 3.0.4)</label>
              <input
                type="text"
                value={versions.android?.minimumVersion || ''}
                onChange={(e) => handleChange('android', 'minimumVersion', e.target.value)}
                placeholder="3.0.4"
              />
            </div>
            <div className="form-group">
              <label>Minimum Version Code</label>
              <input
                type="number"
                value={versions.android?.minimumVersionCode || ''}
                onChange={(e) => handleChange('android', 'minimumVersionCode', parseInt(e.target.value))}
                placeholder="21"
              />
            </div>
            <div className="form-group">
              <label>App Store URL (for reference)</label>
              <input
                type="url"
                value={versions.android?.appStoreUrl || ''}
                onChange={(e) => handleChange('android', 'appStoreUrl', e.target.value)}
                placeholder="https://apps.apple.com/app/id..."
              />
            </div>
            <div className="form-group">
              <label>Play Store URL</label>
              <input
                type="url"
                value={versions.android?.playStoreUrl || ''}
                onChange={(e) => handleChange('android', 'playStoreUrl', e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={versions.android?.isBlocking || false}
                  onChange={(e) => handleChange('android', 'isBlocking', e.target.checked)}
                />
                <span>Block app access if version is outdated</span>
              </label>
            </div>
            <div className="form-group">
              <label>Update Message (English)</label>
              <textarea
                value={versions.android?.updateMessage || ''}
                onChange={(e) => handleChange('android', 'updateMessage', e.target.value)}
                rows={3}
                placeholder="A new version of the app is available. Please update to continue."
              />
            </div>
            <div className="form-group">
              <label>Update Message (Arabic)</label>
              <textarea
                value={versions.android?.updateMessageAr || ''}
                onChange={(e) => handleChange('android', 'updateMessageAr', e.target.value)}
                rows={3}
                placeholder="إصدار جديد من التطبيق متاح. يرجى التحديث للمتابعة."
              />
            </div>
            <div className="form-group">
              <label>Update Message (French)</label>
              <textarea
                value={versions.android?.updateMessageFr || ''}
                onChange={(e) => handleChange('android', 'updateMessageFr', e.target.value)}
                rows={3}
                placeholder="Une nouvelle version de l'application est disponible. Veuillez mettre à jour pour continuer."
              />
            </div>
            <button
              className="save-btn"
              onClick={() => handleSave('android')}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Android Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppVersion;
