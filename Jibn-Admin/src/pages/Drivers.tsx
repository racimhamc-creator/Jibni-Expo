import React, { useState, useEffect } from 'react';
import {
  Search,
  Ban,
  CheckCircle,
  Car,
  Star,
  TrendingUp,
  User as UserIcon,
  Phone,
  DollarSign,
  Calendar,
  Upload,
  FileImage,
  X,
} from 'lucide-react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import DataTable from '../components/Shared/DataTable';
import { adminAPI, User, DriverRanking } from '../services/api';
import './Dashboard.css';


interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} className="tab-panel">
    {value === index && children}
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
  const [total, setTotal] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [rankingType, setRankingType] = useState('top_revenue');
  
  // Driver profile data
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [driverMissions, setDriverMissions] = useState<any[]>([]);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Document upload
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleCardFile, setVehicleCardFile] = useState<File | null>(null);

  useEffect(() => {
    const loadDriversEffect = async () => {
      try {
        setLoading(true);
        const params: any = { page, limit: 20 };
        if (search) params.search = search;
        if (statusFilter !== 'all') params.banned = statusFilter === 'banned';
        
        const data = await adminAPI.getDrivers(params);
        setDrivers((data.drivers || []) as User[]);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
        setError(null);
      } catch (err) {
        setError('Failed to load drivers');
      } finally {
        setLoading(false);
      }
    };
    loadDriversEffect();
  }, [page, statusFilter, search]);

  useEffect(() => {
    const loadRankingsEffect = async () => {
      try {
        const data = await adminAPI.getDriverRankings(rankingType as any, 20);
        setRankings(data as DriverRanking[]);
      } catch (err) {
        console.error('Failed to load rankings');
      }
    };
    loadRankingsEffect();
  }, [rankingType]);

  // Debounced search - search as user types with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        setPage(1);
        loadDrivers(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDrivers = async (pageNum: number = page) => {
    try {
      setLoading(true);
      const params: any = { page: pageNum, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.banned = statusFilter === 'banned';
      
      const data = await adminAPI.getDrivers(params);
      setDrivers((data.drivers || []) as User[]);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
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
      setRankings(data as DriverRanking[]);
    } catch (err) {
      console.error('Failed to load rankings');
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadDrivers(1);
  };

  const openBanDialog = (driver: User) => {
    setSelectedDriver(driver);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const openProfileDialog = async (driver: User) => {
    setSelectedDriver(driver);
    setProfileDialogOpen(true);
    setProfileLoading(true);
    
    // Use user_id (from backend) or _id
    const driverId = driver.user_id || driver._id;
    console.log('Opening profile for driver:', driverId, driver);
    
    try {
      const data = await adminAPI.getDriverProfile(driverId);
      setDriverProfile(data.profile);
      setDriverStats(data.stats);
      setDriverMissions(data.missions || []);
    } catch (err) {
      console.error('Failed to load driver profile:', err);
      setDriverProfile(null);
      setDriverStats(null);
      setDriverMissions([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBanToggle = async () => {
    if (!selectedDriver || !selectedDriver.user_id) return;
    
    try {
      const newBannedStatus = !selectedDriver.banned;
      await adminAPI.banUser(selectedDriver.user_id, newBannedStatus, banReason);
      
      setDrivers(drivers.map(d => 
        d._id === selectedDriver._id ? { ...d, banned: newBannedStatus } : d
      ));
      setBanDialogOpen(false);
    } catch (err) {
      setError('Failed to update ban status');
    }
  };

  const getStatusChip = (driver: User) => {
    if (!driver) return <span className="status-badge offline">Unknown</span>;
    if (driver.banned) {
      return <span className="status-badge banned">Banned</span>;
    }
    if (driver.isOnline) {
      return <span className="status-badge online">Online</span>;
    }
    return <span className="status-badge offline">Offline</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
  };

  const handleDocumentUpload = async () => {
    if (!selectedDriver || (!licenseFile && !vehicleCardFile)) return;
    
    const driverId = selectedDriver.user_id || selectedDriver._id;
    setUploadingDocs(true);
    
    try {
      const formData = new FormData();
      if (licenseFile) {
        formData.append('drivingLicense', licenseFile);
      }
      if (vehicleCardFile) {
        formData.append('vehicleCard', vehicleCardFile);
      }
      
      await adminAPI.uploadDriverDocuments(driverId, formData);
      
      // Refresh profile data
      const data = await adminAPI.getDriverProfile(driverId);
      setDriverProfile(data.profile);
      
      // Clear file inputs
      setLicenseFile(null);
      setVehicleCardFile(null);
      
      alert('Documents uploaded successfully!');
    } catch (err: any) {
      alert('Failed to upload documents: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingDocs(false);
    }
  };

  const driverColumns = [
    { 
      header: 'Driver', 
      accessor: 'firstName',
      render: (_: any, driver: User) => (
        <div className="user-cell">
          <div className="user-avatar small">
            <Car size={16} />
          </div>
          <span>{driver?.firstName || ''} {driver?.lastName || ''}</span>
        </div>
      )
    },
    { header: 'Phone', accessor: 'phoneNumber' },
    { header: 'City', accessor: 'city' },
    { 
      header: 'Revenue', 
      accessor: 'totalRevenue',
      render: (value: number) => formatCurrency(value || 0)
    },
    { header: 'Missions', accessor: 'totalMissions' },
    { 
      header: 'Rating', 
      accessor: 'rating',
      render: (value: number) => (
        <span className={`rating-badge ${(value || 0) >= 4 ? 'high' : (value || 0) >= 3 ? 'medium' : 'low'}`}>
          <Star size={12} />
          {(value || 0).toFixed(1)}
        </span>
      )
    },
    { header: 'Status', render: (_: any, driver: User) => getStatusChip(driver) },
    { 
      header: 'Actions', 
      render: (_: any, driver: User) => (
        <div className="actions-cell">
          <button
            className="action-btn info"
            onClick={() => openProfileDialog(driver)}
            title="View Profile"
          >
            <UserIcon size={16} />
            Profile
          </button>
          <button
            className={`action-btn ${driver?.banned ? 'success' : 'danger'}`}
            onClick={() => openBanDialog(driver)}
          >
            {driver?.banned ? <CheckCircle size={16} /> : <Ban size={16} />}
            {driver?.banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      )
    },
  ];

  const rankingColumns = [
    { 
      header: 'Rank', 
      accessor: (row: DriverRanking, index: number) => index + 1,
      render: (value: number) => (
        <span className={`rank-badge ${value <= 3 ? 'top' : ''}`}>#{value}</span>
      )
    },
    { 
      header: 'Driver', 
      accessor: 'firstName',
      render: (_: any, driver: DriverRanking) => `${driver?.firstName || ''} ${driver?.lastName || ''}`
    },
    { header: 'Phone', accessor: 'phoneNumber' },
    { 
      header: 'Revenue', 
      accessor: 'totalRevenue',
      render: (value: number) => formatCurrency(value || 0)
    },
    { header: 'Missions', accessor: 'totalMissions' },
    { 
      header: 'Rating', 
      accessor: 'rating',
      render: (value: number) => (
        <span className={`rating-badge ${(value || 0) >= 4 ? 'high' : (value || 0) >= 3 ? 'medium' : 'low'}`}>
          <Star size={12} />
          {(value || 0).toFixed(1)}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessor: 'isOnline',
      render: (value: boolean) => (
        value ? 
          <span className="status-badge active">Online</span> :
          <span className="status-badge offline">Offline</span>
      )
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Drivers Management</h1>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="tabs-container">
        <button 
          className={`tab-btn ${tabValue === 0 ? 'active' : ''}`}
          onClick={() => setTabValue(0)}
        >
          All Drivers
        </button>
        <button 
          className={`tab-btn ${tabValue === 1 ? 'active' : ''}`}
          onClick={() => setTabValue(1)}
        >
          <TrendingUp size={16} />
          Rankings
        </button>
      </div>

      <TabPanel value={tabValue} index={0}>
        {/* Filters - Tab Style */}
        <div className="filters-card">
          <div className="filters-header">
            <div className="filters-tabs">
              <button 
                className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setPage(1); }}
              >
                All Drivers
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('active'); setPage(1); }}
              >
                Active
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'banned' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('banned'); setPage(1); }}
              >
                Banned
              </button>
            </div>
            <div className="results-count">
              {loading ? 'Loading...' : `${total.toLocaleString()} driver${total !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="filters-search">
            <div className="search-field">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, phone, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {search && (
                <button 
                  className="search-clear-btn"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                    setTimeout(() => loadDrivers(1), 0);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button className="primary-btn" onClick={handleSearch}>
              <Search size={16} />
              Search
            </button>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="table-card">
          <DataTable
            columns={driverColumns}
            data={drivers}
            loading={loading}
            pagination={{
              page,
              limit: 20,
              total,
              pages: totalPages,
            }}
            onPageChange={setPage}
            emptyMessage="No drivers found"
          />
        </div>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <div className="filters-card">
          <div className="filters-header">
            <div className="filters-tabs">
              <button 
                className={`filter-tab ${rankingType === 'top_revenue' ? 'active' : ''}`}
                onClick={() => setRankingType('top_revenue')}
              >
                Top Revenue
              </button>
              <button 
                className={`filter-tab ${rankingType === 'lowest_revenue' ? 'active' : ''}`}
                onClick={() => setRankingType('lowest_revenue')}
              >
                Lowest Revenue
              </button>
              <button 
                className={`filter-tab ${rankingType === 'top_rated' ? 'active' : ''}`}
                onClick={() => setRankingType('top_rated')}
              >
                Top Rated
              </button>
              <button 
                className={`filter-tab ${rankingType === 'lowest_rated' ? 'active' : ''}`}
                onClick={() => setRankingType('lowest_rated')}
              >
                Lowest Rated
              </button>
              <button 
                className={`filter-tab ${rankingType === 'most_active' ? 'active' : ''}`}
                onClick={() => setRankingType('most_active')}
              >
                Most Active
              </button>
              <button 
                className={`filter-tab ${rankingType === 'least_active' ? 'active' : ''}`}
                onClick={() => setRankingType('least_active')}
              >
                Least Active
              </button>
            </div>
            <div className="results-count">
              {rankings.length} driver{rankings.length !== 1 ? 's' : ''} ranked
            </div>
          </div>
        </div>

        <div className="table-card">
          <DataTable
            columns={rankingColumns}
            data={rankings}
            emptyMessage="No rankings available"
          />
        </div>
      </TabPanel>

      {/* Ban/Unban Dialog */}
      <Dialog 
        open={banDialogOpen} 
        onClose={() => setBanDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '16px',
          }
        }}
      >
        <DialogTitle style={{ color: '#fff' }}>
          {selectedDriver?.banned ? 'Unban Driver' : 'Ban Driver'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom style={{ color: '#a0a0a0' }}>
            Are you sure you want to {selectedDriver?.banned ? 'unban' : 'ban'}{' '}
            <strong style={{ color: '#fff' }}>
              {selectedDriver?.firstName} {selectedDriver?.lastName}
            </strong>?
          </Typography>
          {!selectedDriver?.banned && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Ban Reason (Optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              sx={{ 
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  background: '#252525',
                  '& fieldset': { borderColor: '#2a2a2a' },
                  '&:hover fieldset': { borderColor: '#3a3a3a' },
                },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialogOpen(false)} style={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={selectedDriver?.banned ? 'success' : 'error'}
            onClick={handleBanToggle}
          >
            {selectedDriver?.banned ? 'Unban' : 'Ban'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Driver Profile Dialog */}
      <Dialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '16px',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle style={{ color: '#fff', borderBottom: '1px solid #2a2a2a' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: '#667eea' }} src={driverProfile?.avatar}>
              <Car />
            </Avatar>
            <Box>
              <Typography variant="h6" color="#fff">
                {driverProfile?.fullName || `${selectedDriver?.firstName} ${selectedDriver?.lastName}`}
              </Typography>
              <Typography variant="body2" color="#a0a0a0">
                {driverProfile?.phoneNumber || selectedDriver?.phoneNumber}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {profileLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Profile Info */}
              {driverProfile && (
                <Grid size={{ xs: 12 }}>
                  <Card sx={{ bgcolor: '#252525', mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" color="#fff" gutterBottom>
                        Profile Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="#a0a0a0">City</Typography>
                          <Typography variant="body2" color="#fff">{driverProfile.city || 'N/A'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="#a0a0a0">Vehicle Type</Typography>
                          <Typography variant="body2" color="#fff">{driverProfile.vehicleType || 'N/A'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="#a0a0a0">Rating</Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Star size={14} color="#ffc107" />
                            <Typography variant="body2" color="#fff">
                              {(driverProfile.rating || 0).toFixed(1)} ({driverProfile.totalRatings || 0} reviews)
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="#a0a0a0">Status</Typography>
                          <Box>
                            <Chip 
                              label={driverProfile.isOnline ? 'Online' : 'Offline'} 
                              size="small"
                              sx={{ 
                                bgcolor: driverProfile.isOnline ? '#4caf50' : '#757575',
                                color: '#fff',
                                fontSize: '11px'
                              }}
                            />
                            {driverProfile.openToWork && (
                              <Chip 
                                label="Open to Work" 
                                size="small"
                                sx={{ 
                                  bgcolor: '#2196f3',
                                  color: '#fff',
                                  fontSize: '11px',
                                  ml: 1
                                }}
                              />
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                      
                      {/* Documents Section with Images */}
                      {(driverProfile.drivingLicense?.url || driverProfile.vehicleCard?.url) ? (
                        <>
                          <Divider sx={{ my: 2, bgcolor: '#2a2a2a' }} />
                          <Typography variant="subtitle2" color="#fff" gutterBottom>
                            Documents
                          </Typography>
                          <Grid container spacing={3}>
                            {/* Driving License */}
                            {driverProfile.drivingLicense?.url && (
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="#a0a0a0" display="block" gutterBottom>
                                  Driving License {driverProfile.drivingLicense.number && `- ${driverProfile.drivingLicense.number}`}
                                </Typography>
                                <Box
                                  sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: 150,
                                    bgcolor: '#1a1a1a',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    border: '1px solid #2a2a2a',
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: '#667eea' }
                                  }}
                                  onClick={() => window.open(driverProfile.drivingLicense.url, '_blank')}
                                >
                                  <img
                                    src={driverProfile.drivingLicense.url}
                                    alt="Driving License"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      p: 1,
                                      bgcolor: 'rgba(0,0,0,0.7)',
                                      textAlign: 'center'
                                    }}
                                  >
                                    <Typography variant="caption" color="#fff">
                                      Click to view full size
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                            )}
                            
                            {/* Vehicle Card */}
                            {driverProfile.vehicleCard?.url && (
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="#a0a0a0" display="block" gutterBottom>
                                  Vehicle Card {driverProfile.vehicleCard.number && `- ${driverProfile.vehicleCard.number}`}
                                </Typography>
                                <Box
                                  sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: 150,
                                    bgcolor: '#1a1a1a',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    border: '1px solid #2a2a2a',
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: '#667eea' }
                                  }}
                                  onClick={() => window.open(driverProfile.vehicleCard.url, '_blank')}
                                >
                                  <img
                                    src={driverProfile.vehicleCard.url}
                                    alt="Vehicle Card"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      p: 1,
                                      bgcolor: 'rgba(0,0,0,0.7)',
                                      textAlign: 'center'
                                    }}
                                  >
                                    <Typography variant="caption" color="#fff">
                                      Click to view full size
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                          
                          {/* Update Documents Section */}
                          <Box sx={{ mt: 3, p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px dashed #3a3a3a' }}>
                            <Typography variant="caption" color="#a0a0a0" display="block" gutterBottom>
                              Update Documents
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Button
                                  variant="outlined"
                                  component="label"
                                  fullWidth
                                  startIcon={<FileImage size={16} />}
                                  sx={{ 
                                    borderColor: '#2a2a2a',
                                    color: licenseFile ? '#4caf50' : '#a0a0a0',
                                    justifyContent: 'flex-start'
                                  }}
                                >
                                  {licenseFile ? 'New License Selected' : 'Update License'}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                                  />
                                </Button>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Button
                                  variant="outlined"
                                  component="label"
                                  fullWidth
                                  startIcon={<FileImage size={16} />}
                                  sx={{ 
                                    borderColor: '#2a2a2a',
                                    color: vehicleCardFile ? '#4caf50' : '#a0a0a0',
                                    justifyContent: 'flex-start'
                                  }}
                                >
                                  {vehicleCardFile ? 'New Card Selected' : 'Update Vehicle Card'}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setVehicleCardFile(e.target.files?.[0] || null)}
                                  />
                                </Button>
                              </Grid>
                            </Grid>
                            
                            {(licenseFile || vehicleCardFile) && (
                              <Button
                                variant="contained"
                                fullWidth
                                sx={{ mt: 2 }}
                                onClick={handleDocumentUpload}
                                disabled={uploadingDocs}
                                startIcon={<Upload size={16} />}
                              >
                                {uploadingDocs ? 'Uploading...' : 'Update Documents'}
                              </Button>
                            )}
                          </Box>
                        </>
                      ) : (
                        <>
                          <Divider sx={{ my: 2, bgcolor: '#2a2a2a' }} />
                          <Typography variant="subtitle2" color="#fff" gutterBottom>
                            Documents
                          </Typography>
                          <Alert severity="info" sx={{ bgcolor: '#252525', color: '#fff', mb: 2 }}>
                            No documents uploaded for this driver
                          </Alert>
                          
                          {/* Document Upload Section */}
                          <Box sx={{ bgcolor: '#1a1a1a', p: 2, borderRadius: 2, border: '1px dashed #3a3a3a' }}>
                            <Typography variant="caption" color="#a0a0a0" display="block" gutterBottom>
                              Upload Documents
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Button
                                  variant="outlined"
                                  component="label"
                                  fullWidth
                                  startIcon={<FileImage size={16} />}
                                  sx={{ 
                                    borderColor: '#2a2a2a',
                                    color: licenseFile ? '#4caf50' : '#a0a0a0',
                                    justifyContent: 'flex-start'
                                  }}
                                >
                                  {licenseFile ? 'License Selected' : 'Select License'}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                                  />
                                </Button>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Button
                                  variant="outlined"
                                  component="label"
                                  fullWidth
                                  startIcon={<FileImage size={16} />}
                                  sx={{ 
                                    borderColor: '#2a2a2a',
                                    color: vehicleCardFile ? '#4caf50' : '#a0a0a0',
                                    justifyContent: 'flex-start'
                                  }}
                                >
                                  {vehicleCardFile ? 'Card Selected' : 'Select Vehicle Card'}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setVehicleCardFile(e.target.files?.[0] || null)}
                                  />
                                </Button>
                              </Grid>
                            </Grid>
                            
                            {(licenseFile || vehicleCardFile) && (
                              <Button
                                variant="contained"
                                fullWidth
                                sx={{ mt: 2 }}
                                onClick={handleDocumentUpload}
                                disabled={uploadingDocs}
                                startIcon={<Upload size={16} />}
                              >
                                {uploadingDocs ? 'Uploading...' : 'Upload Documents'}
                              </Button>
                            )}
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Stats Cards */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" color="#fff" gutterBottom>
                  Mission Statistics
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Card sx={{ bgcolor: '#252525', minWidth: 120, flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="#2196f3" fontWeight="bold">
                        {driverStats?.active || 0}
                      </Typography>
                      <Typography variant="body2" color="#a0a0a0">
                        Active
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#252525', minWidth: 120, flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="#4caf50" fontWeight="bold">
                        {driverStats?.completed || 0}
                      </Typography>
                      <Typography variant="body2" color="#a0a0a0">
                        Completed
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#252525', minWidth: 120, flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="#ff9800" fontWeight="bold">
                        {driverStats?.cancelled || 0}
                      </Typography>
                      <Typography variant="body2" color="#a0a0a0">
                        Cancelled
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#252525', minWidth: 120, flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="#9e9e9e" fontWeight="bold">
                        {driverStats?.no_driver_found || 0}
                      </Typography>
                      <Typography variant="body2" color="#a0a0a0">
                        Expired
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>

              {/* Mission History */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" color="#fff" gutterBottom sx={{ mt: 2 }}>
                  Mission History
                </Typography>
                
                {driverMissions.length === 0 ? (
                  <Alert severity="info" sx={{ bgcolor: '#252525', color: '#fff' }}>
                    No missions found for this driver
                  </Alert>
                ) : (
                  <Box className="mission-history-list">
                    {driverMissions.map((mission, idx) => (
                      <Card 
                        key={mission.id || idx} 
                        sx={{ 
                          bgcolor: '#252525', 
                          mb: 2,
                          border: '1px solid #2a2a2a',
                          '&:hover': { borderColor: '#3a3a3a' }
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 3 }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Phone size={16} color="#a0a0a0" />
                                <Typography variant="body2" color="#fff">
                                  {mission.clientPhone}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Calendar size={16} color="#a0a0a0" />
                                <Typography variant="body2" color="#fff">
                                  {mission.date}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Star size={16} color="#ffc107" />
                                <Typography variant="body2" color="#fff">
                                  Rating({mission.rating?.toFixed(1) || '0.0'})
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <DollarSign size={16} color="#4caf50" />
                                <Typography variant="body2" color="#fff" fontWeight="medium">
                                  {formatCurrency(mission.price)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                              <Typography variant="caption" color="#667eea" fontWeight="medium">
                                ID: {mission.rideId}
                              </Typography>
                            </Grid>
                          </Grid>
                          
                          <Divider sx={{ my: 1.5, bgcolor: '#2a2a2a' }} />
                          
                          <Box display="flex" gap={2}>
                            <Chip 
                              label={mission.status} 
                              size="small"
                              sx={{ 
                                bgcolor: mission.status === 'completed' ? '#4caf50' : 
                                        mission.status === 'cancelled' ? '#f44336' :
                                        mission.status === 'active' ? '#2196f3' : '#757575',
                                color: '#fff',
                                textTransform: 'capitalize'
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ borderTop: '1px solid #2a2a2a', p: 2 }}>
          <Button onClick={() => setProfileDialogOpen(false)} style={{ color: '#a0a0a0' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Drivers;
