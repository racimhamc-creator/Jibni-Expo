import { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, AlertCircle, Info, AlertTriangle, FileText } from 'lucide-react';
import { logsAPI } from '../../services/api';
import './AppLogs.css';

const AppLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    warnings: 0,
    byLevel: {},
    byPlatform: {},
  });
  const [filters, setFilters] = useState({
    level: '',
    platform: '',
    search: '',
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.level) params.append('level', filters.level);
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await logsAPI.getAll(params.toString());
      if (response.data.success) {
        setLogs(response.data.data.logs);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await logsAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filter changes
    }));
  };

  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to delete all logs older than 7 days?')) {
      return;
    }
    try {
      await logsAPI.deleteLogs({ olderThan: 7 });
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Failed to clear logs');
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="log-icon error" />;
      case 'warn':
        return <AlertTriangle className="log-icon warn" />;
      case 'info':
        return <Info className="log-icon info" />;
      default:
        return <FileText className="log-icon log" />;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return '#f43f5e';
      case 'warn':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="app-logs-page">
      <div className="page-header">
        <div className="header-info">
          <h2>App Logs</h2>
          <p>View and debug app logs from production builds</p>
        </div>
        <button className="danger-btn" onClick={clearLogs}>
          <Trash2 size={18} />
          Clear Old Logs
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total.toLocaleString()}</div>
          <div className="stat-label">Total Logs</div>
        </div>
        <div className="stat-card error">
          <div className="stat-value">{stats.errors.toLocaleString()}</div>
          <div className="stat-label">Errors</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-value">{stats.warnings.toLocaleString()}</div>
          <div className="stat-label">Warnings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats.byPlatform?.ios || 0} iOS / {stats.byPlatform?.android || 0} Android
          </div>
          <div className="stat-label">By Platform</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <select
          value={filters.level}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          className="filter-select"
        >
          <option value="">All Levels</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="info">Info</option>
          <option value="log">Logs</option>
        </select>
        <select
          value={filters.platform}
          onChange={(e) => handleFilterChange('platform', e.target.value)}
          className="filter-select"
        >
          <option value="">All Platforms</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
          <option value="web">Web</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="logs-container">
        {loading ? (
          <div className="loading-state">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No logs found</div>
        ) : (
          <>
            <div className="logs-table">
              <div className="table-header">
                <div className="col-level">Level</div>
                <div className="col-time">Time</div>
                <div className="col-message">Message</div>
                <div className="col-platform">Platform</div>
                <div className="col-user">User</div>
              </div>
              <div className="table-body">
                {logs.map((log) => (
                  <div key={log._id} className="log-row">
                    <div className="col-level">
                      <span
                        className="level-badge"
                        style={{ color: getLevelColor(log.level) }}
                      >
                        {getLevelIcon(log.level)}
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="col-time">{formatTimestamp(log.timestamp)}</div>
                    <div className="col-message">
                      <div className="message-text">{log.message}</div>
                      {log.data && (
                        <details className="log-data">
                          <summary>View Data</summary>
                          <pre>{typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                    <div className="col-platform">
                      {log.platform ? (
                        <span className="platform-badge">{log.platform.toUpperCase()}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </div>
                    <div className="col-user">
                      {log.userId?.username || log.userId?.email || (
                        <span className="text-muted">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                  disabled={filters.page === 1}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', Math.min(pagination.pages, filters.page + 1))}
                  disabled={filters.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AppLogs;
