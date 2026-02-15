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
} from '@mui/material';
import { Search, Block, CheckCircle, Person } from '@mui/icons-material';
import { adminAPI, User } from '../services/api';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadClients();
  }, [page, statusFilter]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20, role: 'client' };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.banned = statusFilter === 'banned';
      
      const data = await adminAPI.getUsers(params);
      setClients(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setError(null);
    } catch (err) {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadClients();
  };

  const openBanDialog = (client: User, currentStatus: boolean) => {
    setSelectedClient(client);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleBanToggle = async () => {
    if (!selectedClient) return;
    
    try {
      const newBannedStatus = !selectedClient.banned;
      await adminAPI.banUser(selectedClient._id, newBannedStatus, banReason);
      
      setClients(clients.map(c => 
        c._id === selectedClient._id ? { ...c, banned: newBannedStatus } : c
      ));
      setBanDialogOpen(false);
    } catch (err) {
      setError('Failed to update ban status');
    }
  };

  const getStatusChip = (banned: boolean) => {
    if (banned) {
      return <Chip icon={<Block />} label="Banned" color="error" size="small" />;
    }
    return <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Clients Management
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
              placeholder="Name, phone, or city"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
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

      {/* Clients Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>Missions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client._id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Person color="action" />
                          {client.firstName} {client.lastName}
                        </Box>
                      </TableCell>
                      <TableCell>{client.phoneNumber}</TableCell>
                      <TableCell>{client.city}</TableCell>
                      <TableCell>{client.totalMissions || 0}</TableCell>
                      <TableCell>{getStatusChip(client.banned)}</TableCell>
                      <TableCell>
                        {new Date(client.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          color={client.banned ? 'success' : 'error'}
                          startIcon={client.banned ? <CheckCircle /> : <Block />}
                          onClick={() => openBanDialog(client, client.banned)}
                        >
                          {client.banned ? 'Unban' : 'Ban'}
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

      {/* Ban/Unban Dialog */}
      <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedClient?.banned ? 'Unban Client' : 'Ban Client'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to {selectedClient?.banned ? 'unban' : 'ban'} <strong>{selectedClient?.firstName} {selectedClient?.lastName}</strong>?
          </Typography>
          {!selectedClient?.banned && (
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
            color={selectedClient?.banned ? 'success' : 'error'}
            onClick={handleBanToggle}
          >
            {selectedClient?.banned ? 'Unban' : 'Ban'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Clients;
