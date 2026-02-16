import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  MemoryStick,
  Cpu,
  Network,
  Server,
  RefreshCw,
  Clock,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Alert,
  CircularProgress,
} from '@mui/material';
import { adminAPI, ServerStatus } from '../services/api';
import './Dashboard.css';

const COLORS = ['#667eea', '#22c55e', '#f59e0b', '#ef4444', '#9c27b0', '#2196f3'];

const ServerStatusPage: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getServerStatus();
      setStatus(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError('Failed to load server status: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getUsageColor = (percent: number) => {
    if (percent < 50) return '#22c55e';
    if (percent < 80) return '#f59e0b';
    return '#ef4444';
  };

  if (loading && !status) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <span>Loading server status...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">
          <Server size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
          Server Status Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#888', fontSize: 14 }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button className="primary-btn" onClick={loadStatus} disabled={loading}>
            <RefreshCw size={16} style={{ marginRight: 8, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* OS Info Card */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stats-card stats-card--primary">
          <div className="stats-card-header">
            <div className="stats-icon">
              <Server size={22} />
            </div>
          </div>
          <div className="stats-card-body">
            <h3 className="stats-value" style={{ fontSize: '1.2rem' }}>{status?.os?.hostname || 'Unknown'}</h3>
            <p className="stats-title">Hostname</p>
          </div>
        </div>
        <div className="stats-card stats-card--blue">
          <div className="stats-card-header">
            <div className="stats-icon">
              <Activity size={22} />
            </div>
          </div>
          <div className="stats-card-body">
            <h3 className="stats-value" style={{ fontSize: '1.2rem' }}>{status?.os?.platform || 'Unknown'}</h3>
            <p className="stats-title">{status?.os?.distro || 'OS'}</p>
          </div>
        </div>
        <div className="stats-card stats-card--purple">
          <div className="stats-card-header">
            <div className="stats-icon">
              <Cpu size={22} />
            </div>
          </div>
          <div className="stats-card-body">
            <h3 className="stats-value" style={{ fontSize: '1.2rem' }}>{status?.cpu?.cores || 0} Cores</h3>
            <p className="stats-title">{status?.cpu?.model?.split(' ').slice(0, 3).join(' ') || 'CPU'}</p>
          </div>
        </div>
        <div className="stats-card stats-card--green">
          <div className="stats-card-header">
            <div className="stats-icon">
              <Clock size={22} />
            </div>
          </div>
          <div className="stats-card-body">
            <h3 className="stats-value" style={{ fontSize: '1.2rem' }}>{formatUptime(status?.os?.uptime || 0)}</h3>
            <p className="stats-title">Uptime</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        {/* Memory Usage */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              <MemoryStick size={20} />
              Memory Usage
            </h3>
          </div>
          <div className="chart-body">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: getUsageColor(status?.memory?.percent || 0) }}>
                {status?.memory?.percent || 0}%
              </div>
              <div style={{ color: '#888', fontSize: 14 }}>
                {formatBytes(status?.memory?.used || 0)} / {formatBytes(status?.memory?.total || 0)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Used', value: status?.memory?.used || 0 },
                    { name: 'Free', value: status?.memory?.free || 0 }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  <Cell fill="#667eea" />
                  <Cell fill="#2a2a2a" />
                </Pie>
                <Tooltip formatter={(value: any) => formatBytes(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU Usage */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              <Cpu size={20} />
              CPU Usage
            </h3>
          </div>
          <div className="chart-body">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: getUsageColor(status?.cpu?.percent || 0) }}>
                {status?.cpu?.percent || 0}%
              </div>
              <div style={{ color: '#888', fontSize: 14 }}>
                {status?.cpu?.model || 'CPU'}
              </div>
            </div>
            <div style={{ padding: '0 20px' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Load Average (1m)</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{(status?.cpu?.load_average?.[0] || 0).toFixed(2)}</span>
                </div>
                <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2 }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min((status?.cpu?.load_average?.[0] || 0) / (status?.cpu?.cores || 1) * 100, 100)}%`,
                      background: getUsageColor(((status?.cpu?.load_average?.[0] || 0) / (status?.cpu?.cores || 1)) * 100),
                      borderRadius: 2,
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Load Average (5m)</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{(status?.cpu?.load_average?.[1] || 0).toFixed(2)}</span>
                </div>
                <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2 }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min((status?.cpu?.load_average?.[1] || 0) / (status?.cpu?.cores || 1) * 100, 100)}%`,
                      background: getUsageColor(((status?.cpu?.load_average?.[1] || 0) / (status?.cpu?.cores || 1)) * 100),
                      borderRadius: 2,
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Load Average (15m)</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{(status?.cpu?.load_average?.[2] || 0).toFixed(2)}</span>
                </div>
                <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2 }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min((status?.cpu?.load_average?.[2] || 0) / (status?.cpu?.cores || 1) * 100, 100)}%`,
                      background: getUsageColor(((status?.cpu?.load_average?.[2] || 0) / (status?.cpu?.cores || 1)) * 100),
                      borderRadius: 2,
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        {/* Disk Usage */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3 className="chart-title">
              <HardDrive size={20} />
              Disk Usage
            </h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={status?.disk || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" stroke="#a0a0a0" tickFormatter={(v) => formatBytes(v)} />
                <YAxis dataKey="device" type="category" stroke="#a0a0a0" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: any) => [formatBytes(Number(value)), name]}
                />
                <Legend />
                <Bar dataKey="used" name="Used" fill="#667eea" radius={[0, 4, 4, 0]} />
                <Bar dataKey="free" name="Free" fill="#2a2a2a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
              {status?.disk?.map((d, i) => (
                <div key={d.device} style={{ flex: 1, minWidth: 150, padding: 12, background: '#1a1a1a', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#fff', fontSize: 14 }}>{d.device}</span>
                    <span style={{ color: getUsageColor(d.percent), fontSize: 14, fontWeight: 'bold' }}>{d.percent}%</span>
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>{formatBytes(d.used)} / {formatBytes(d.total)}</div>
                  <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, marginTop: 8 }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${d.percent}%`,
                        background: getUsageColor(d.percent),
                        borderRadius: 2
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Network Traffic */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              <Network size={20} />
              Network Traffic
            </h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={status?.network?.slice(0, 4) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="interface" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" tickFormatter={(v) => formatBytes(v)} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => formatBytes(Number(value))}
                />
                <Legend />
                <Bar dataKey="bytes_recv" name="Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bytes_sent" name="Sent" fill="#667eea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16 }}>
              {status?.network?.slice(0, 4).map((n, i) => (
                <div key={n.interface} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2a2a' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>{n.interface}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#22c55e', fontSize: 12 }}>↓ {formatBytes(n.bytes_recv)}</div>
                    <div style={{ color: '#667eea', fontSize: 12 }}>↑ {formatBytes(n.bytes_sent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OS Details */}
      <div className="chart-card full-width">
        <div className="chart-header">
          <h3 className="chart-title">
            <Server size={20} />
            Operating System Details
          </h3>
        </div>
        <div className="chart-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Platform</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{status?.os?.platform || 'N/A'}</div>
            </div>
            <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Distribution</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{status?.os?.distro || 'N/A'}</div>
            </div>
            <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Release</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{status?.os?.release || 'N/A'}</div>
            </div>
            <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Kernel</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{status?.os?.kernel || 'N/A'}</div>
            </div>
            <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Architecture</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{status?.os?.arch || 'N/A'}</div>
            </div>
            <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Codename</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{status?.os?.codename || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStatusPage;
