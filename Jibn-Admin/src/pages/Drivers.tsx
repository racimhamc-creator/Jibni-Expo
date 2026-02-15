import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { Search, Block, CheckCircle, LocalShipping, Star, TrendingUp } from '@mui/icons-material';
import { adminAPI, User, DriverRanking } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const Drivers: React.FC = () => {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [rankings, setRankings] = useState<DriverRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [rankingType, setRankingType] = useState('top_revenue');

  useEffect(() => {
    loadDrivers();
  }, [page, statusFilter]);

  useEffect(() => {
    loadRankings();
  }, [rankingType]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.banned = statusFilter === 'banned';
      
      const data = await adminAPI.getDrivers(params);
      setDrivers(data.drivers || []);
      setTotalPages(data.pagination?.pages || 1);
      setError(null);
    } catch (err) {
      setError('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async () => {
    try {
      const data = await adminAPI.getDriverRankings(rankingType as any, 20);
      setRankings(data);
    } catch (err) {
      console.error('Failed to load rankings');
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadDrivers();
  };

  const openBanDialog = (driver: User) => {
    setSelectedDriver(driver);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleBanToggle = async () => {
    if (!selectedDriver) return;
    
    try {
      const newBannedStatus = !selectedDriver.banned;
      await adminAPI.banUser(selectedDriver._id, newBannedStatus, banReason);
      
      setDrivers(drivers.map(d => 
        d._id === selectedDriver._id ? { ...d, banned: newBannedStatus } : d
      ));
      setBanDialogOpen(false);
    } catch (err) {
      setError('Failed to update ban status');
    }
  };

  const getStatusChip = (driver: User) => {
    if (driver.banned) {
      return <Chip icon={<Block />} label="Banned" color="error" size="small" />;
    }
    if (driver.openToWork) {
      return <Chip icon={<CheckCircle />} label="Open to Work" color="success" size="small" />;
    }
    return <Chip icon={<LocalShipping />} label="Offline" color="default" size="small" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Drivers Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
        <Tab label="All Drivers" />
        <Tab label="Rankings" icon={<TrendingUp />} iconPosition="start" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                label="Search"
                placeholder="Name, phone, or city"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch}>
                      <Search />
                    </IconButton>
                  ),
                }}
                sx={{ flex: 1, minWidth: 200 }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="banned">Banned</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleSearch}>
                Search
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Drivers Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Driver</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Missions</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : drivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No drivers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    drivers.map((driver) => (
                      <TableRow key={driver._id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocalShipping color="action" />
                            {driver.firstName} {driver.lastName}
                          </Box>
                        </TableCell>
                        <TableCell>{driver.phoneNumber}</TableCell>
                        <TableCell>{driver.city}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(driver.totalRevenue || 0)}
                        </TableCell>
                        <TableCell align="right">{driver.totalMissions || 0}</TableCell>
                        <TableCell>
                          <Chip
                            icon={<Star />}
                            label={driver.rating?.toFixed(1) || '0.0'}
                            size="small"
                            color={driver.rating >= 4 ? 'success' : driver.rating >= 3 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{getStatusChip(driver)}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="outlined"
                            size="small"
                            color={driver.banned ? 'success' : 'error'}
                            startIcon={driver.banned ? <CheckCircle /> : <Block />}
                            onClick={() => openBanDialog(driver)}
                          >
                            {driver.banned ? 'Unban' : 'Ban'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Driver Rankings</Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Ranking Type</InputLabel>
                <Select
                  value={rankingType}
                  onChange={(e) => setRankingType(e.target.value)}
                  label="Ranking Type"
                >
                  <MenuItem value="top_revenue">Top Revenue</MenuItem>
                  <MenuItem value="lowest_revenue">Lowest Revenue</MenuItem>
                  <MenuItem value="top_rated">Top Rated</MenuItem>
                  <MenuItem value="lowest_rated">Lowest Rated</MenuItem>
                  <MenuItem value="most_active">Most Active</MenuItem>
                  <MenuItem value="least_active">Least Active</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Missions</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankings.map((driver, index) => (
                    <TableRow key={driver._id}>
                      <TableCell>
                        <Chip
                          label={`#${index + 1}`}
                          color={index < 3 ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {driver.firstName} {driver.lastName}
                      </TableCell>
                      <TableCell>{driver.phoneNumber}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(driver.totalRevenue)}
                      </TableCell>
                      <TableCell align="right">{driver.totalMissions}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<Star />}
                          label={driver.rating?.toFixed(1) || '0.0'}
                          size="small"
                          color={driver.rating >= 4 ? 'success' : driver.rating >= 3 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        {driver.openToWork ? (
                          <Chip label="Open to Work" color="success" size="small" />
                        ) : (
                          <Chip label="Offline" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Ban/Unban Dialog */}
      <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDriver?.banned ? 'Unban Driver' : 'Ban Driver'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to {selectedDriver?.banned ? 'unban' : 'ban'} <strong>{selectedDriver?.firstName} {selectedDriver?.lastName}</strong>?
          </Typography>
          {!selectedDriver?.banned && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Ban Reason (Optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={selectedDriver?.banned ? 'success' : 'error'}
            onClick={handleBanToggle}
          >
            {selectedDriver?.banned ? 'Unban' : 'Ban'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Drivers;
