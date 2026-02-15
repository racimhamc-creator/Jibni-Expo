import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  People,
  LocalShipping,
  PendingActions,
  Block,
  AttachMoney,
  Assignment,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { adminAPI, DashboardStats, User, Mission } from '../services/api';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0'];

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            label="Period"
          >
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="3months">Last 3 Months</MenuItem>
            <MenuItem value="6months">Last 6 Months</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <People color="primary" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalUsers || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <LocalShipping color="success" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Drivers
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalDrivers || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PendingActions color="warning" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Pending Requests
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.pendingDriverRequests || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Block color="error" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Banned Users
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.bannedUsers || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Assignment color="info" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Missions
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalMissions || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="success" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Revenue
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Mission Status Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Missions by Status
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.missionsByStatus || []}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {(stats?.missionsByStatus || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry._id) || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Drivers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Drivers
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Driver</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.topDrivers || []).slice(0, 5).map((driver) => (
                      <TableRow key={driver._id}>
                        <TableCell>
                          {driver.firstName} {driver.lastName}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${driver.rating.toFixed(1)} ★`}
                            size="small"
                            color={driver.rating >= 4 ? 'success' : driver.rating >= 3 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(driver.totalRevenue || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Missions */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Missions
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mission ID</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Driver</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.recentMissions || []).slice(0, 5).map((mission) => (
                      <TableRow key={mission._id}>
                        <TableCell>{mission.missionId}</TableCell>
                        <TableCell>{mission.client?.firstName} {mission.client?.lastName}</TableCell>
                        <TableCell>
                          {mission.driver ? `${mission.driver.firstName} ${mission.driver.lastName}` : 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mission.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(mission.status),
                              color: '#fff',
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(mission.price)}</TableCell>
                        <TableCell>
                          {new Date(mission.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
