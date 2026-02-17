import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Trash2,
  MapPin,
  Navigation,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Grid,
  Box,
} from '@mui/material';
import DataTable from '../components/Shared/DataTable';
import { adminAPI, Mission } from '../services/api';
import './Dashboard.css';

const Missions: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadMissions = async (pageNum: number = page) => {
    try {
      setLoading(true);
      const params: any = { page: pageNum, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const data = await adminAPI.getMissions(params);
      setMissions(data.missions || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setError(null);
    } catch (err: any) {
      setError('Failed to load missions: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        setPage(1);
        loadMissions(1);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = () => {
    setPage(1);
    loadMissions(1);
  };

  const openDetailDialog = (mission: Mission) => {
    setSelectedMission(mission);
    setDetailDialogOpen(true);
  };

  const openDeleteDialog = (mission: Mission) => {
    setSelectedMission(mission);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    const missionId = selectedMission?.id || selectedMission?._id;
    if (!missionId) return;
    
    try {
      await adminAPI.deleteMission(missionId);
      setMissions(missions.filter(m => (m.id || m._id) !== missionId));
      setDeleteDialogOpen(false);
    } catch (err) {
      setError('Failed to delete mission');
    }
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, { class: string; label: string }> = {
      searching: { class: 'offline', label: 'Searching' },
      assigned: { class: 'active', label: 'Assigned' },
      accepted: { class: 'online', label: 'Accepted' },
      driver_arrived: { class: 'active', label: 'Driver Arrived' },
      in_progress: { class: 'active', label: 'In Progress' },
      completed: { class: 'online', label: 'Completed' },
      cancelled: { class: 'banned', label: 'Cancelled' },
      no_driver_found: { class: 'offline', label: 'No Driver' },
      pending: { class: 'offline', label: 'Pending' },
    };
    const config = colors[status] || { class: 'offline', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openGoogleMaps = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const missionColumns = [
    { 
      header: 'Mission ID', 
      accessor: 'missionId',
      width: '140px',
      render: (_: any, mission: any) => (
        <span className="font-mono text-sm">{mission.rideId || mission.missionId || 'N/A'}</span>
      )
    },
    { 
      header: 'Client', 
      accessor: 'client',
      render: (_: any, mission: any) => (
        <div>
          <div className="font-medium">{mission.client || 'N/A'}</div>
          <div className="text-xs text-gray-400">{mission.clientPhone || mission.client_phone_number || ''}</div>
        </div>
      )
    },
    { 
      header: 'Driver', 
      accessor: 'driver',
      render: (_: any, mission: any) => {
        if (!mission.driverName && !mission.depanneur && !mission.server_name) return <span className="text-gray-500">Not assigned</span>;
        return (
          <div>
            <div className="font-medium">{mission.driverName || mission.depanneur || mission.server_name || 'N/A'}</div>
            <div className="text-xs text-gray-400">{mission.driverPhone || mission.server_phone_number || ''}</div>
          </div>
        );
      }
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      width: '160px',
      render: (value: string) => formatDate(value)
    },
    { 
      header: 'Route', 
      accessor: 'pickupAddress',
      render: (_: any, mission: any) => (
        <div className="flex items-center gap-2">
          <div className="text-sm flex-1">
            <div className="truncate max-w-[180px]" title={mission.pickupAddress || mission.destination?.from}>
              <span className="text-gray-400">From:</span> {mission.pickupAddress || mission.destination?.from || 'N/A'}
            </div>
            <div className="truncate max-w-[180px]" title={mission.destinationAddress || mission.destination?.to}>
              <span className="text-gray-400">To:</span> {mission.destinationAddress || mission.destination?.to || 'N/A'}
            </div>
          </div>
          {(mission.destination?.fromLat && mission.destination?.toLat) && (
            <button
              className="action-btn info"
              onClick={() => openGoogleMaps(
                mission.destination.fromLat,
                mission.destination.fromLng || 0,
                mission.destination.toLat,
                mission.destination.toLng || 0
              )}
              title="View on Google Maps"
            >
              <MapPin size={16} />
            </button>
          )}
        </div>
      )
    },
    { 
      header: 'Price', 
      accessor: 'price',
      width: '100px',
      align: 'right' as const,
      render: (_: any, mission: any) => (
        <span className="font-medium">{formatCurrency(mission.price || mission.tarif || 0)}</span>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      width: '120px',
      render: (value: string) => getStatusChip(value)
    },
    { 
      header: 'Actions', 
      width: '100px',
      align: 'center' as const,
      render: (_: any, mission: Mission) => (
        <div className="actions-cell">
          <button className="action-btn info" onClick={() => openDetailDialog(mission)} title="View Details">
            <Eye size={16} />
          </button>
          <button className="action-btn danger" onClick={() => openDeleteDialog(mission)} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Missions Management</h1>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-header">
          <div className="filters-tabs">
            <button 
              className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
            >
              All Statuses
            </button>
            <button 
              className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('pending'); setPage(1); }}
            >
              Pending
            </button>
            <button 
              className={`filter-tab ${statusFilter === 'accepted' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('accepted'); setPage(1); }}
            >
              Accepted
            </button>
            <button 
              className={`filter-tab ${statusFilter === 'in_progress' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('in_progress'); setPage(1); }}
            >
              In Progress
            </button>
            <button 
              className={`filter-tab ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('completed'); setPage(1); }}
            >
              Completed
            </button>
            <button 
              className={`filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('cancelled'); setPage(1); }}
            >
              Cancelled
            </button>
          </div>
          <div className="results-count">
            {loading ? 'Loading...' : `${total.toLocaleString()} mission${total !== 1 ? 's' : ''}`}
          </div>
        </div>
        
        <div className="filters-search">
          <div className="search-field">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by mission ID, address, or user..."
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
                  setTimeout(() => loadMissions(1), 0);
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

      {/* Missions Table */}
      <div className="table-card">
        <DataTable
          columns={missionColumns}
          data={missions}
          loading={loading}
          pagination={{
            page,
            limit: 20,
            total,
            pages: totalPages,
          }}
          onPageChange={setPage}
          emptyMessage="No missions found"
        />
      </div>

      {/* Mission Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
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
          Mission Details - {selectedMission?.rideId || selectedMission?.missionId}
        </DialogTitle>
        <DialogContent>
          {selectedMission && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Mission ID</Typography>
                <Typography variant="body1" color="#fff">{selectedMission.rideId || selectedMission.missionId}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Date</Typography>
                <Typography variant="body1" color="#fff">{formatDate(selectedMission.createdAt)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Pickup Location</Typography>
                <Typography variant="body1" color="#fff">{selectedMission.pickupAddress || selectedMission.destination?.from || 'N/A'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Destination</Typography>
                <Typography variant="body1" color="#fff">{selectedMission.destinationAddress || selectedMission.destination?.to || 'N/A'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Client</Typography>
                <Typography variant="body1" color="#fff">
                  {selectedMission.client || 'N/A'}
                </Typography>
                <Typography variant="body2" color="#888">
                  {selectedMission.clientPhone || selectedMission.client_phone_number || 'N/A'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Driver</Typography>
                <Typography variant="body1" color="#fff">
                  {selectedMission.driverName || selectedMission.depanneur || selectedMission.server_name || 'Not assigned'}
                </Typography>
                <Typography variant="body2" color="#888">
                  {selectedMission.driverPhone || selectedMission.server_phone_number || ''}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Status</Typography>
                <Box mt={1}>{getStatusChip(selectedMission.status)}</Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Price</Typography>
                <Typography variant="h6" color="#667eea" fontWeight="bold">
                  {formatCurrency(selectedMission.price || selectedMission.tarif || 0)}
                </Typography>
              </Grid>
              {(selectedMission.destination?.fromLat && selectedMission.destination?.toLat) && (
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Navigation />}
                    onClick={() => {
                      if (selectedMission.destination?.fromLat && selectedMission.destination?.toLat) {
                        openGoogleMaps(
                          selectedMission.destination.fromLat,
                          selectedMission.destination.fromLng || 0,
                          selectedMission.destination.toLat,
                          selectedMission.destination.toLng || 0
                        );
                      }
                    }}
                    sx={{ 
                      color: '#667eea', 
                      borderColor: '#667eea',
                      '&:hover': { borderColor: '#764ba2', background: 'rgba(102, 126, 234, 0.1)' }
                    }}
                  >
                    View Route on Google Maps
                  </Button>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)} style={{ color: '#a0a0a0' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          style: {
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '16px',
          }
        }}
      >
        <DialogTitle style={{ color: '#fff' }}>Delete Mission</DialogTitle>
        <DialogContent>
          <Typography style={{ color: '#a0a0a0' }}>
            Are you sure you want to delete mission{' '}
            <strong style={{ color: '#fff' }}>{selectedMission?.rideId || selectedMission?.missionId}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} style={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Missions;
