import { useState, useEffect } from 'react';
import { Send, Bell, AlertCircle, CheckCircle, Loader, User } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import './Notifications.css';

const Notifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalTokens: 0, tokensByPlatform: {} });
  const [result, setResult] = useState(null);
  const [sendMode, setSendMode] = useState('all'); // 'all' or 'user'
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await notificationsAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      setResult({
        type: 'error',
        message: 'Please fill in both title and message fields.',
      });
      return;
    }

    if (sendMode === 'user' && !targetUserId.trim()) {
      setResult({
        type: 'error',
        message: 'Please enter a user ID to send to a specific user.',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let response;
      if (sendMode === 'user') {
        response = await notificationsAPI.sendToUser(targetUserId.trim(), { title, message });
      } else {
        response = await notificationsAPI.send({ title, message });
      }
      
      if (response.data.success) {
        setResult({
          type: 'success',
          message: `Notification sent successfully to ${response.data.sent} device(s).`,
          details: {
            sent: response.data.sent,
            failed: response.data.failed,
            total: response.data.total,
          },
        });
        // Clear form
        setTitle('');
        setMessage('');
        if (sendMode === 'user') {
          setTargetUserId('');
        }
        // Refresh stats
        fetchStats();
      } else {
        setResult({
          type: 'error',
          message: response.data.message || 'Failed to send notification.',
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.message || 'An error occurred while sending the notification.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="notifications-header-content">
          <Bell className="notifications-icon" />
          <div>
            <h1>Push Notifications</h1>
            <p>Send push notifications to all app users</p>
          </div>
        </div>
      </div>

      <div className="notifications-stats">
        <div className="stat-card">
          <div className="stat-label">Total Devices</div>
          <div className="stat-value">{stats.totalTokens}</div>
        </div>
        {Object.keys(stats.tokensByPlatform).length > 0 && (
          <div className="platform-stats">
            {Object.entries(stats.tokensByPlatform).map(([platform, count]) => (
              <div key={platform} className="platform-stat">
                <span className="platform-name">{platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : platform}</span>
                <span className="platform-count">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="notifications-form-container">
        <form onSubmit={handleSubmit} className="notifications-form">
          <div className="form-group">
            <label>Send To</label>
            <div className="send-mode-toggle">
              <button
                type="button"
                className={`mode-button ${sendMode === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSendMode('all');
                  setTargetUserId('');
                  setResult(null);
                }}
              >
                <Bell className="mode-icon" />
                All Users
              </button>
              <button
                type="button"
                className={`mode-button ${sendMode === 'user' ? 'active' : ''}`}
                onClick={() => {
                  setSendMode('user');
                  setResult(null);
                }}
              >
                <User className="mode-icon" />
                Single User
              </button>
            </div>
          </div>

          {sendMode === 'user' && (
            <div className="form-group">
              <label htmlFor="userId">User ID *</label>
              <input
                type="text"
                id="userId"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user ID (MongoDB ObjectId)"
                disabled={loading}
                required={sendMode === 'user'}
              />
              <small className="form-hint">
                Find user ID from Users page or database. Must be a valid MongoDB ObjectId.
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              maxLength={100}
              disabled={loading}
              required
            />
            <span className="char-count">{title.length}/100</span>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={6}
              maxLength={500}
              disabled={loading}
              required
            />
            <span className="char-count">{message.length}/500</span>
          </div>

          {result && (
            <div className={`result-message ${result.type}`}>
              {result.type === 'success' ? (
                <CheckCircle className="result-icon" />
              ) : (
                <AlertCircle className="result-icon" />
              )}
              <div className="result-content">
                <div className="result-message-text">{result.message}</div>
                {result.details && (
                  <div className="result-details">
                    <div>Sent: {result.details.sent}</div>
                    {result.details.failed > 0 && (
                      <div className="failed-count">Failed: {result.details.failed}</div>
                    )}
                    <div>Total: {result.details.total}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="send-button"
            disabled={loading || !title.trim() || !message.trim()}
          >
            {loading ? (
              <>
                <Loader className="button-icon spinning" />
                Sending...
              </>
            ) : (
              <>
                <Send className="button-icon" />
                {sendMode === 'user' ? 'Send Notification to User' : 'Send Notification to All Users'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Notifications;
