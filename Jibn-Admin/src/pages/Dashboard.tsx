import React, { useState, useEffect } from 'react';
import {
  Users,
  Car,
  ClipboardList,
  Ban,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  MapPin,
  Clock,
  Star,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import StatsCard from '../components/Shared/StatsCard';
import DataTable from '../components/Shared/DataTable';
import { adminAPI, DashboardStats, User, Mission } from '../services/api';
import './Dashboard.css';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#667eea'];

interface UserGrowthData {
  name: string;
  clients: number;
  drivers: number;
}

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadUserGrowth();
  }, [period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDashboardStats(period);
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadUserGrowth = async () => {
    try {
      // Get user growth data for the last 6 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 5);
      
      const breakdown = await adminAPI.getCalendarBreakdown(
        'new_users',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      // Transform data for chart
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const grouped = breakdown.reduce((acc: any, item: any) => {
        const date = new Date(item.date);
        const monthKey = months[date.getMonth()];
        if (!acc[monthKey]) {
          acc[monthKey] = { clients: 0, drivers: 0 };
        }
        if (item.role === 'client') {
          acc[monthKey].clients += item.count;
        } else if (item.role === 'driver') {
          acc[monthKey].drivers += item.count;
        }
        return acc;
      }, {});
      
      // Convert to array format for chart
      const chartData = Object.entries(grouped).map(([name, counts]: [string, any]) => ({
        name,
        clients: counts.clients,
        drivers: counts.drivers,
      }));
      
      setUserGrowthData(chartData.length > 0 ? chartData : getDefaultUserGrowthData());
    } catch (err) {
      console.error('Failed to load user growth:', err);
      setUserGrowthData(getDefaultUserGrowthData());
    }
  };

  const getDefaultUserGrowthData = (): UserGrowthData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((name, index) => ({
      name,
      clients: (stats?.totalClients || 0) > 0 ? Math.round((stats?.totalClients || 0) / 6 * (index + 1)) : 0,
      drivers: (stats?.totalDrivers || 0) > 0 ? Math.round((stats?.totalDrivers || 0) / 6 * (index + 1)) : 0,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'in_progress': return '#2196f3';
      case 'pending': return '#ff9800';
      case 'cancelled': return '#f44336';
      case 'accepted': return '#9c27b0';
      default: return '#757575';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
  };

  // Real revenue data from calendar
  const revenueData = stats?.calendar?.map(day => ({
    name: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: day.revenue || 0,
    date: day.date,
  })) || [];

  // Calculate trend percentages
  const getTrend = (current: number, previous: number): { trend: 'up' | 'down'; value: string } => {
    if (previous === 0) return { trend: 'up', value: '0%' };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change >= 0 ? 'up' : 'down',
      value: `${Math.abs(change).toFixed(1)}%`
    };
  };

  // Calculate trends for each stat
  const userTrend = getTrend(stats?.totalUsers || 0, (stats?.totalUsers || 0) - (stats?.userGrowth || 0));
  const driverTrend = { trend: 'up' as const, value: `${stats?.driverGrowth?.toFixed(1) || 0}%` };
  const bannedTrend = { 
    trend: (stats?.bannedGrowth || 0) > 0 ? 'up' as const : 'down' as const, 
    value: `${Math.abs(stats?.bannedGrowth || 0).toFixed(1)}%` 
  };
  const missionsTrend = { trend: 'up' as const, value: `${stats?.missionsGrowth?.toFixed(1) || 0}%` };
  const revenueTrend = { trend: 'up' as const, value: `${stats?.revenueGrowth?.toFixed(1) || 0}%` };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Period Selector */}
      <div className="period-selector">
        <div className="period-buttons">
          {(['week', 'month', '3months', '6months', 'year'] as const).map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === '3months' ? '3 Months' : p === '6months' ? '6 Months' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          trend={userTrend.trend}
          trendValue={userTrend.value}
          color="primary"
        />
        <StatsCard
          title="Active Drivers"
          value={stats?.activeDrivers || 0}
          icon={Car}
          trend={driverTrend.trend}
          trendValue={driverTrend.value}
          color="purple"
        />
        <StatsCard
          title="Pending Requests"
          value={stats?.pendingDriverRequests || 0}
          icon={ClipboardList}
          trend="down"
          trendValue="0%"
          color="orange"
        />
        <StatsCard
          title="Banned Users"
          value={stats?.bannedUsers || 0}
          icon={Ban}
          trend={bannedTrend.trend}
          trendValue={bannedTrend.value}
          color="pink"
        />
        <StatsCard
          title="Total Missions"
          value={stats?.totalMissions || 0}
          icon={MapPin}
          trend={missionsTrend.trend}
          trendValue={missionsTrend.value}
          color="blue"
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          trend={revenueTrend.trend}
          trendValue={revenueTrend.value}
          color="green"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        {/* Mission Status Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              <Activity size={20} />
              Missions by Status
            </h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats?.missionsByStatus || []}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={60}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                >
                  {(stats?.missionsByStatus || []).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getStatusColor(entry._id) || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3 className="chart-title">
              <TrendingUp size={20} />
              Revenue Trend
            </h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#667eea" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        {/* User Growth Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3 className="chart-title">
              <Users size={20} />
              User Growth
            </h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="clients" fill="#667eea" radius={[4, 4, 0, 0]} />
                <Bar dataKey="drivers" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Drivers Table */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              <Car size={20} />
              Top Performing Drivers
            </h3>
          </div>
          <div className="chart-body table-container">
            <table className="simple-table top-drivers-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Rating</th>
                  <th>Missions</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.topDrivers || []).length > 0 ? (stats?.topDrivers || []).map((driver, idx) => (
                  <tr key={driver?._id || idx}>
                    <td>
                      <div className="driver-info">
                        <div className="driver-avatar">
                          {driver?.firstName?.[0] || '?'}{driver?.lastName?.[0] || '?'}
                        </div>
                        <div className="driver-details">
                          <span className="driver-name">{driver?.firstName || 'Unknown'} {driver?.lastName || ''}</span>
                          <span className="driver-phone">{driver?.phoneNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rating-cell">
                        <Star size={14} className="star-icon" />
                        <span className={`rating-badge ${(driver?.rating || 0) >= 4 ? 'high' : (driver?.rating || 0) >= 3 ? 'medium' : 'low'}`}>
                          {(driver?.rating || 0).toFixed(1)}
                        </span>
                        <span className="rating-count">({driver?.totalRatings || 0} reviews)</span>
                      </div>
                    </td>
                    <td>
                      <span className="mission-count">
                        {driver?.totalMissions || 0}
                      </span>
                    </td>
                    <td>{formatCurrency(driver?.totalRevenue || 0)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      No driver data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Missions */}
      <div className="chart-card full-width">
        <div className="chart-header">
          <h3 className="chart-title">
            <Clock size={20} />
            Recent Missions
          </h3>
        </div>
        <div className="chart-body">
          <DataTable
            columns={[
              { header: 'Mission ID', accessor: 'missionId', width: '120px' },
              { 
                header: 'Client', 
                accessor: 'client',
                render: (client) => client ? `${client.firstName || ''} ${client.lastName || ''}` : 'N/A'
              },
              { 
                header: 'Driver', 
                accessor: 'driver',
                render: (driver) => driver 
                  ? `${driver.firstName || ''} ${driver.lastName || ''}`
                  : 'Unassigned'
              },
              { 
                header: 'Status',
                accessor: 'status',
                render: (status) => (
                  <span 
                    className="status-badge"
                    style={{ 
                      background: getStatusColor(status),
                      color: '#fff'
                    }}
                  >
                    {status}
                  </span>
                )
              },
              { 
                header: 'Price', 
                accessor: 'price',
                render: (price) => formatCurrency(price)
              },
              { 
                header: 'Date', 
                accessor: 'createdAt',
                render: (createdAt) => new Date(createdAt).toLocaleDateString()
              },
            ]}
            data={stats?.recentMissions?.slice(0, 5) || []}
            emptyMessage="No recent missions"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
