import React, { useState, useEffect } from 'react';
import {
  Search,
  Ban,
  CheckCircle,
  User as UserIcon,
  Phone,
  X,
  Calendar,
  Gift,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import DataTable from '../components/Shared/DataTable';
import { adminAPI, Client } from '../services/api';
import './Dashboard.css';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadClients();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        setPage(1);
        loadClients(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadClients = async (pageNum: number = page) => {
    try {
      setLoading(true);
      const params: any = { page: pageNum, limit: 20, role: 'client' };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.banned = statusFilter === 'banned';
      
      const data = await adminAPI.getClients(params);
      setClients((data.clients || []) as Client[]);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadClients(1);
  };

  const openBanDialog = (client: Client) => {
    setSelectedClient(client);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleBanToggle = async () => {
    if (!selectedClient || !selectedClient.user_id) return;
    
    try {
      const newBannedStatus = !selectedClient.banned;
      await adminAPI.banUser(selectedClient.user_id, newBannedStatus, banReason);
      
      setClients(clients.map(c => 
        c._id === selectedClient._id ? { ...c, banned: newBannedStatus } : c
      ));
      setBanDialogOpen(false);
    } catch (err) {
      setError('Failed to update ban status');
    }
  };

  const getStatusChip = (client: Client) => {
    if (!client) return <span className="status-badge offline">Unknown</span>;
    if (client.banned) {
      return <span className="status-badge banned">Banned</span>;
    }
    return <span className="status-badge online">Active</span>;
  };

  const getBeneficiaireChip = (beneficiaire: boolean) => {
    if (beneficiaire) {
      return (
        <span className="status-badge active">
          <Gift size={12} style={{ marginRight: 4 }} />
          Yes
        </span>
      );
    }
    return <span className="status-badge offline">No</span>;
  };

  const clientColumns = [
    { 
      header: 'Client', 
      accessor: 'firstName',
      render: (_: any, client: Client) => (
        <div className="user-cell">
          <div className="user-avatar small">
            <UserIcon size={16} />
          </div>
          <span>{client?.firstName || ''} {client?.lastName || ''}</span>
        </div>
      )
    },
    { header: 'Phone', accessor: 'phoneNumber' },
    { header: 'City', accessor: 'city' },
    { 
      header: 'Bénéficiaire', 
      accessor: 'beneficiaire',
      render: (value: boolean) => getBeneficiaireChip(value)
    },
    { 
      header: 'Status', 
      render: (_: any, client: Client) => getStatusChip(client)
    },
    { 
      header: 'Joined', 
      accessor: 'createdAt',
      render: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    { 
      header: 'Actions', 
      render: (_: any, client: Client) => (
        <div className="actions-cell">
          <button
            className={`action-btn ${client?.banned ? 'success' : 'danger'}`}
            onClick={() => openBanDialog(client)}
          >
            {client?.banned ? <CheckCircle size={16} /> : <Ban size={16} />}
            {client?.banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Clients Management</h1>
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
              All Clients
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
            {loading ? 'Loading...' : `${total.toLocaleString()} client${total !== 1 ? 's' : ''}`}
          </div>
        </div>
        
        <div className="filters-search">
          <div className="search-field">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or phone..."
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
                  setTimeout(() => loadClients(1), 0);
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

      {/* Clients Table */}
      <div className="table-card">
        <DataTable
          columns={clientColumns}
          data={clients}
          loading={loading}
          pagination={{
            page,
            limit: 20,
            total,
            pages: totalPages,
          }}
          onPageChange={setPage}
          emptyMessage="No clients found"
        />
      </div>

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
          {selectedClient?.banned ? 'Unban Client' : 'Ban Client'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom style={{ color: '#a0a0a0' }}>
            Are you sure you want to {selectedClient?.banned ? 'unban' : 'ban'}{' '}
            <strong style={{ color: '#fff' }}>
              {selectedClient?.firstName} {selectedClient?.lastName}
            </strong>?
          </Typography>
          {!selectedClient?.banned && (
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
            color={selectedClient?.banned ? 'success' : 'error'}
            onClick={handleBanToggle}
          >
            {selectedClient?.banned ? 'Unban' : 'Ban'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Clients;
