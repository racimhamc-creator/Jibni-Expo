import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Ticket, 
  UserCheck,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import StatsCard from '../../components/Shared/StatsCard';
import { castingAPI, eventsAPI, authAPI, ticketsAPI, adminAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: { total: 0, today: 0 },
    events: { total: 0, active: 0 },
    tickets: { total: 0, revenue: 0 },
    casting: { total: 0, pending: 0, accepted: 0, rejected: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    console.log('Dashboard mounted - fetching data...');
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    console.log('fetchDashboardData called');
    
    try {
      setLoading(true);
      
      // Fetch dashboard stats from backend (includes accurate ticket counts and revenue)
      console.log('Making API calls...');
      
      const [dashboardStatsRes, castingStatsRes, eventsRes] = await Promise.allSettled([
        adminAPI.getDashboardStats(), // Use dashboard endpoint for accurate stats
        castingAPI.getStats(),
        eventsAPI.getAll(),
      ]);

      console.log('Dashboard Stats Response:', dashboardStatsRes);
      console.log('Casting Stats Response:', castingStatsRes);
      console.log('Events Response:', eventsRes);

      // Process dashboard stats (includes users, tickets, revenue)
      if (dashboardStatsRes.status === 'fulfilled' && dashboardStatsRes.value.data.stats) {
        const statsData = dashboardStatsRes.value.data.stats;
        console.log('Dashboard Stats Data:', statsData);
        
        setStats(prev => ({
          ...prev,
          users: {
            total: statsData.users?.total || 0,
            today: statsData.users?.today || 0
          },
          events: {
            total: statsData.events?.total || 0,
            active: statsData.events?.active || 0
          },
          tickets: {
            total: statsData.tickets?.total || 0,
            revenue: statsData.revenue?.total || 0
          }
        }));
      } else {
        console.error('Dashboard Stats Error:', dashboardStatsRes.reason);
      }

      // Process casting stats
      if (castingStatsRes.status === 'fulfilled') {
        console.log('Casting Stats Data:', castingStatsRes.value.data);
        if (castingStatsRes.value.data.stats) {
          setStats(prev => ({
            ...prev,
            casting: castingStatsRes.value.data.stats
          }));
        }
      } else {
        console.error('Casting Stats Error:', castingStatsRes.reason);
      }

      // Process events for recent events list
      if (eventsRes.status === 'fulfilled') {
        console.log('Events Data:', eventsRes.value.data);
        const eventsData = eventsRes.value.data.events || eventsRes.value.data || [];
        // Ensure events is always an array
        const events = Array.isArray(eventsData) ? eventsData : [];
        setRecentEvents(events.slice(0, 5));
      } else {
        console.error('Events Error:', eventsRes.reason);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      console.log('Fetch complete, loading set to false');
    }
  };

  // Sample chart data
  const revenueData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Apr', value: 4500 },
    { name: 'May', value: 6000 },
    { name: 'Jun', value: 5500 },
  ];

  const castingPieData = [
    { name: 'Pending', value: stats.casting.pending || 0, color: '#fbbf24' },
    { name: 'Accepted', value: stats.casting.accepted || 0, color: '#00d4aa' },
    { name: 'Rejected', value: stats.casting.rejected || 0, color: '#f43f5e' },
  ];

  console.log('Current stats state:', stats);
  console.log('Current recentEvents:', recentEvents);

  return (
    <div className="dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        <StatsCard
          title="Total Users"
          value="4.7k"
          icon={Users}
          trend="up"
          trendValue={12}
          color="primary"
        />
        <StatsCard
          title="Active Events"
          value={loading ? '...' : stats.events.active}
          icon={Calendar}
          trend="up"
          trendValue={8}
          color="purple"
        />
        <StatsCard
          title="Tickets Sold"
          value="903"
          icon={Ticket}
          trend="up"
          trendValue={23}
          color="orange"
        />
        <StatsCard
          title="Casting Applications"
          value="434"
          icon={UserCheck}
          trend="up"
          trendValue={15}
          color="pink"
        />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Revenue Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue Overview</h3>
            <div className="revenue-total">
              Total: ${stats.tickets.revenue?.toLocaleString() || 0}
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b6b7b', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b6b7b', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{
                    background: '#1a1a25',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00d4aa" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Casting Status Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Casting Status</h3>
          </div>
          <div className="chart-body pie-chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={castingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {castingPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: '#1a1a25',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {castingPieData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-dot" style={{ background: item.color }}></span>
                  <span className="legend-label">{item.name}</span>
                  <span className="legend-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        {/* Recent Events */}
        <div className="card recent-events">
          <div className="card-header">
            <h3>Recent Events</h3>
            <a href="/events" className="view-all">View all</a>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : recentEvents.length === 0 ? (
              <div className="empty-state">No events found</div>
            ) : (
              <ul className="events-list">
                {recentEvents.map((event) => (
                  <li key={event._id} className="event-item">
                    <div className="event-image">
                      {event.image ? (
                        <img src={event.image} alt={event.name} />
                      ) : (
                        <Calendar size={20} />
                      )}
                    </div>
                    <div className="event-info">
                      <h4>{event.name}</h4>
                      <span>{event.location}</span>
                    </div>
                    <div className={`event-status ${event.isActive ? 'active' : 'inactive'}`}>
                      {event.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card quick-stats">
          <div className="card-header">
            <h3>Quick Stats</h3>
          </div>
          <div className="card-body">
            <div className="quick-stat-item">
              <div className="quick-stat-icon">
                <Clock size={20} />
              </div>
              <div className="quick-stat-info">
                <span className="quick-stat-value">{stats.casting.pending || 0}</span>
                <span className="quick-stat-label">Pending Applications</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-icon success">
                <CheckCircle size={20} />
              </div>
              <div className="quick-stat-info">
                <span className="quick-stat-value">{stats.casting.accepted || 0}</span>
                <span className="quick-stat-label">Accepted</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-icon purple">
                <TrendingUp size={20} />
              </div>
              <div className="quick-stat-info">
                <span className="quick-stat-value">{stats.events.total}</span>
                <span className="quick-stat-label">Total Events</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-icon orange">
                <DollarSign size={20} />
              </div>
              <div className="quick-stat-info">
                <span className="quick-stat-value">${stats.tickets.revenue?.toLocaleString() || 0}</span>
                <span className="quick-stat-label">Total Revenue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
