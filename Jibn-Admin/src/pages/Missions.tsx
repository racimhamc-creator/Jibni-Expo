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
  Grid,
} from '@mui/material';
import { Search, Visibility, Delete, Edit, LocationOn } from '@mui/icons-material';
import { adminAPI, Mission } from '../services/api';

const Missions: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadMissions();
  }, [page, statusFilter]);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const data = await adminAPI.getMissions(params);
      setMissions(data.missions || []);
      setTotalPages(data.pagination?.pages || 1);
      setError(null);
    } catch (err) {
      setError('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadMissions();
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
    if (!selectedMission) return;
    
    try {
      await adminAPI.deleteMission(selectedMission._id);
      setMissions(missions.filter(m => m._id !== selectedMission._id));
      setDeleteDialogOpen(false);
    } catch (err) {
      setError('Failed to delete mission');
    }
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, any> = {
      pending: { color: 'warning', label: 'Pending' },
      accepted: { color: 'info', label: 'Accepted' },
      in_progress: { color: 'primary', label: 'In Progress' },
      completed: { color: 'success', label: 'Completed' },
      cancelled: { color: 'error', label: 'Cancelled' },
      disputed: { color: 'secondary', label: 'Disputed' },
    };
    const config = colors[status] || { color: 'default', label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Missions Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Search"
              placeholder="Mission ID, address, or user"
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
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="accepted">Accepted</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="disputed">Disputed</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleSearch}>
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Missions Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mission ID</TableCell>
                  <TableCell>Pickup</TableCell>
                  <TableCell>Dropoff</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : missions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No missions found
                    </TableCell>
                  </TableRow>
                ) : (
                  missions.map((mission) => (
                    <TableRow key={mission._id}>
                      <TableCell>{mission.missionId}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <LocationOn fontSize="small" color="success" />
                          {mission.pickup?.address?.substring(0, 30)}...
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <LocationOn fontSize="small" color="error" />
                          {mission.dropoff?.address?.substring(0, 30)}...
                        </Box>
                      </TableCell>
                      <TableCell>
                        {mission.client?.firstName} {mission.client?.lastName}
                      </TableCell>
                      <TableCell>
                        {mission.driver ? `${mission.driver.firstName} ${mission.driver.lastName}` : '-'}
                      </TableCell>
                      <TableCell>{getStatusChip(mission.status)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(mission.price)}
                      </TableCell>
                      <TableCell>
                        {new Date(mission.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openDetailDialog(mission)}>
                          <Visibility />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => openDeleteDialog(mission)}>
                          <Delete />
                        </IconButton>
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

      {/* Mission Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Mission Details - {selectedMission?.missionId}</DialogTitle>
        <DialogContent>
          {selectedMission && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Pickup</Typography>
                <Typography variant="body1">{selectedMission.pickup?.address}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedMission.pickup?.wilaya}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Dropoff</Typography>
                <Typography variant="body1">{selectedMission.dropoff?.address}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedMission.dropoff?.wilaya}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Client</Typography>
                <Typography variant="body1">
                  {selectedMission.client?.firstName} {selectedMission.client?.lastName}
                </Typography>
                <Typography variant="body2">{selectedMission.client?.phoneNumber}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Driver</Typography>
                <Typography variant="body1">
                  {selectedMission.driver ? 
                    `${selectedMission.driver.firstName} ${selectedMission.driver.lastName}` : 
                    'Not assigned'}
                </Typography>
                {selectedMission.driver && (
                  <Typography variant="body2">{selectedMission.driver.phoneNumber}</Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Box mt={1}>{getStatusChip(selectedMission.status)}</Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Price</Typography>
                <Typography variant="h6">{formatCurrency(selectedMission.price)}</Typography>
              </Grid>
              {selectedMission.vehicleType && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="textSecondary">Vehicle Type</Typography>
                  <Typography variant="body1">{selectedMission.vehicleType}</Typography>
                </Grid>
              )}
              {selectedMission.rating && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="textSecondary">Rating</Typography>
                  <Typography variant="body1">{selectedMission.rating} ★</Typography>
                </Grid>
              )}
              {selectedMission.cancellationReason && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="warning">
                    <Typography variant="subtitle2">Cancellation Reason:</Typography>
                    {selectedMission.cancellationReason}
                  </Alert>
                </Grid>
              )}
              {selectedMission.notes && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="textSecondary">Notes</Typography>
                  <Typography variant="body1">{selectedMission.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Mission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete mission <strong>{selectedMission?.missionId}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Missions;
