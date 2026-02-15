import { useState } from 'react';
import { Save, User, Bell, Shield, Palette } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Settings</h2>
          <p>Manage your account and preferences</p>
        </div>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>Profile Settings</h3>
              <p className="section-desc">Update your personal information</p>
              
              <div className="form-group">
                <label>Profile Photo</label>
                <div className="avatar-upload">
                  <div className="current-avatar">
                    <span>A</span>
                  </div>
                  <button className="upload-btn">Change Photo</button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="Admin" />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="User" />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="admin@shourok.com" />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" placeholder="+213 555 123 456" />
              </div>

              <button className="save-btn">
                <Save size={18} />
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h3>Notification Preferences</h3>
              <p className="section-desc">Choose what notifications you receive</p>
              
              <div className="toggle-group">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Email Notifications</span>
                    <span className="toggle-desc">Receive email updates about activity</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">New Applications</span>
                    <span className="toggle-desc">Get notified when new casting applications arrive</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Ticket Sales</span>
                    <span className="toggle-desc">Notifications for new ticket purchases</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Weekly Reports</span>
                    <span className="toggle-desc">Receive weekly summary reports</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <button className="save-btn">
                <Save size={18} />
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h3>Security Settings</h3>
              <p className="section-desc">Manage your password and security options</p>
              
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" placeholder="••••••••" />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input type="password" placeholder="••••••••" />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" placeholder="••••••••" />
              </div>

              <div className="toggle-group">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Two-Factor Authentication</span>
                    <span className="toggle-desc">Add an extra layer of security</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <button className="save-btn">
                <Save size={18} />
                Update Password
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>Appearance</h3>
              <p className="section-desc">Customize how the dashboard looks</p>
              
              <div className="form-group">
                <label>Theme</label>
                <div className="theme-options">
                  <div className="theme-option active">
                    <div className="theme-preview dark"></div>
                    <span>Dark</span>
                  </div>
                  <div className="theme-option">
                    <div className="theme-preview light"></div>
                    <span>Light</span>
                  </div>
                  <div className="theme-option">
                    <div className="theme-preview system"></div>
                    <span>System</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Accent Color</label>
                <div className="color-options">
                  <button className="color-option active" style={{ background: '#00d4aa' }}></button>
                  <button className="color-option" style={{ background: '#6366f1' }}></button>
                  <button className="color-option" style={{ background: '#f43f5e' }}></button>
                  <button className="color-option" style={{ background: '#fb923c' }}></button>
                  <button className="color-option" style={{ background: '#3b82f6' }}></button>
                </div>
              </div>

              <button className="save-btn">
                <Save size={18} />
                Save Appearance
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

