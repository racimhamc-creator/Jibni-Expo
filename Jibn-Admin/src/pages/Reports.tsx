import React, { useState, useEffect } from 'react';
import {
  Eye,
  Flag,
  Gavel,
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
  Chip,
} from '@mui/material';
import DataTable from '../components/Shared/DataTable';
import { adminAPI, Report } from '../services/api';
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

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [fraudCases, setFraudCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedFraudCase, setSelectedFraudCase] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [fraudDetailDialogOpen, setFraudDetailDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (tabValue === 0) {
      loadReports();
    } else {
      loadFraudCases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, tabValue]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      const data = await adminAPI.getReports(params);
      setReports(data.reports || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadFraudCases = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const data = await adminAPI.getFraudCases(params);
      setFraudCases(data.cases || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError('Failed to load fraud cases');
    } finally {
      setLoading(false);
    }
  };

  const openDetailDialog = (report: Report) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const openFraudDetailDialog = (fraudCase: any) => {
    setSelectedFraudCase(fraudCase);
    setFraudDetailDialogOpen(true);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedReport) return;
    
    try {
      await adminAPI.updateReportStatus(selectedReport.id, status);
      setReports(reports.map(r => 
        r.id === selectedReport.id ? { ...r, status: status as Report['status'] } : r
      ));
      setDetailDialogOpen(false);
    } catch (err) {
      setError('Failed to update report status');
    }
  };

  const handleFraudAction = async (status: string, action?: string) => {
    if (!selectedFraudCase) return;
    
    try {
      await adminAPI.updateFraudCase(selectedFraudCase.id || selectedFraudCase._id, status, action);
      loadFraudCases();
      setFraudDetailDialogOpen(false);
    } catch (err) {
      setError('Failed to update fraud case');
    }
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, { class: string; label: string }> = {
      pending: { class: 'offline', label: 'Pending' },
      investigating: { class: 'active', label: 'Investigating' },
      resolved: { class: 'online', label: 'Resolved' },
      dismissed: { class: 'banned', label: 'Dismissed' },
    };
    const config = colors[status] || { class: 'offline', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getSeverityChip = (severity: string) => {
    const colors: Record<string, { class: string; label: string }> = {
      low: { class: 'online', label: 'Low' },
      medium: { class: 'active', label: 'Medium' },
      high: { class: 'banned', label: 'High' },
      critical: { class: 'banned', label: 'Critical' },
    };
    const config = colors[severity] || { class: 'offline', label: severity };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getTypeChip = (type: string) => {
    const colors: Record<string, { class: string; label: string }> = {
      user: { class: 'active', label: 'User' },
      mission: { class: 'online', label: 'Mission' },
      fraud: { class: 'banned', label: 'Fraud' },
      other: { class: 'offline', label: 'Other' },
    };
    const config = colors[type] || { class: 'offline', label: type };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const reportColumns = [
    { 
      header: 'Type', 
      accessor: 'type',
      width: '100px',
      render: (value: string, report: any) => getTypeChip(value || report.subject || 'other')
    },
    { 
      header: 'Reporter', 
      accessor: 'reporter',
      render: (_: any, report: any) => (
        <div>
          <div className="font-medium">{report.reporter?.firstName || ''} {report.reporter?.lastName || ''}</div>
          <div className="text-xs text-gray-400">{report.reporter?.phoneNumber || ''}</div>
        </div>
      )
    },
    { 
      header: 'Reported', 
      accessor: 'reported',
      render: (_: any, report: any) => (
        <div>
          <div className="font-medium">{report.reported?.firstName || ''} {report.reported?.lastName || ''}</div>
          <div className="text-xs text-gray-400">{report.reported?.phoneNumber || ''}</div>
        </div>
      )
    },
    { 
      header: 'Reason', 
      accessor: 'reason',
      render: (_: any, report: any) => (
        <div className="truncate max-w-[200px]" title={report.reason || report.content}>
          {report.reason || report.content || 'N/A'}
        </div>
      )
    },
    { 
      header: 'Severity', 
      accessor: 'severity',
      width: '100px',
      render: (value: string) => getSeverityChip(value || 'medium')
    },
    { 
      header: 'Status', 
      accessor: 'status',
      width: '120px',
      render: (_: any, report: any) => getStatusChip(report.status || (report.reviewed ? 'resolved' : 'pending'))
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      width: '120px',
      render: (value: string, report: any) => new Date(value || report.created_at).toLocaleDateString()
    },
    { 
      header: 'Actions', 
      width: '80px',
      align: 'center' as const,
      render: (_: any, report: Report) => (
        <div className="actions-cell">
          <button className="action-btn info" onClick={() => openDetailDialog(report)} title="View Details">
            <Eye size={16} />
          </button>
        </div>
      )
    },
  ];

  const fraudColumns = [
    { 
      header: 'Case ID', 
      accessor: 'caseId',
      width: '140px',
      render: (_: any, fraudCase: any) => (
        <span className="font-mono text-sm">{fraudCase.caseId || fraudCase._id?.slice(-8) || 'N/A'}</span>
      )
    },
    { 
      header: 'Type', 
      accessor: 'type',
      width: '100px',
      render: (value: string) => getTypeChip(value)
    },
    { 
      header: 'User', 
      accessor: 'user',
      render: (_: any, fraudCase: any) => (
        <div>
          <div className="font-medium">{fraudCase.user?.firstName || ''} {fraudCase.user?.lastName || ''}</div>
          <div className="text-xs text-gray-400">{fraudCase.user?.phoneNumber || ''}</div>
        </div>
      )
    },
    { 
      header: 'Risk Score', 
      accessor: 'riskScore',
      width: '100px',
      render: (value: number) => {
        const score = value || 0;
        const color = score > 70 ? 'bg-red-500' : score > 40 ? 'bg-yellow-500' : 'bg-green-500';
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`}></div>
            <span className="font-medium">{score}/100</span>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: 'status',
      width: '120px',
      render: (value: string) => getStatusChip(value)
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      width: '120px',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    { 
      header: 'Actions', 
      width: '80px',
      align: 'center' as const,
      render: (_: any, fraudCase: any) => (
        <div className="actions-cell">
          <button className="action-btn info" onClick={() => openFraudDetailDialog(fraudCase)} title="View Details">
            <Eye size={16} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Reports & Fraud Management</h1>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${tabValue === 0 ? 'active' : ''}`}
          onClick={() => { setTabValue(0); setPage(1); setStatusFilter('all'); }}
        >
          <Flag size={16} />
          Reports
        </button>
        <button 
          className={`tab-btn ${tabValue === 1 ? 'active' : ''}`}
          onClick={() => { setTabValue(1); setPage(1); setStatusFilter('all'); }}
        >
          <Gavel size={16} />
          Fraud Detection
        </button>
      </div>

      <TabPanel value={tabValue} index={0}>
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
                className={`filter-tab ${statusFilter === 'investigating' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('investigating'); setPage(1); }}
              >
                Investigating
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('resolved'); setPage(1); }}
              >
                Resolved
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'dismissed' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('dismissed'); setPage(1); }}
              >
                Dismissed
              </button>
            </div>
            <div className="results-count">
              {loading ? 'Loading...' : `${total.toLocaleString()} report${total !== 1 ? 's' : ''}`}
            </div>
          </div>
          
          <div className="filters-search">
            <div className="filters-tabs">
              <button 
                className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setTypeFilter('all'); setPage(1); }}
              >
                All Types
              </button>
              <button 
                className={`filter-tab ${typeFilter === 'user' ? 'active' : ''}`}
                onClick={() => { setTypeFilter('user'); setPage(1); }}
              >
                User
              </button>
              <button 
                className={`filter-tab ${typeFilter === 'mission' ? 'active' : ''}`}
                onClick={() => { setTypeFilter('mission'); setPage(1); }}
              >
                Mission
              </button>
              <button 
                className={`filter-tab ${typeFilter === 'fraud' ? 'active' : ''}`}
                onClick={() => { setTypeFilter('fraud'); setPage(1); }}
              >
                Fraud
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="table-card">
          <DataTable
            columns={reportColumns}
            data={reports}
            loading={loading}
            pagination={{
              page,
              limit: 20,
              total,
              pages: totalPages,
            }}
            onPageChange={setPage}
            emptyMessage="No reports found"
          />
        </div>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Fraud Cases Table */}
        <div className="filters-card">
          <div className="filters-header">
            <div className="filters-tabs">
              <button 
                className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setPage(1); }}
              >
                All Cases
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('pending'); setPage(1); }}
              >
                Pending
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'investigating' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('investigating'); setPage(1); }}
              >
                Investigating
              </button>
              <button 
                className={`filter-tab ${statusFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('resolved'); setPage(1); }}
              >
                Resolved
              </button>
            </div>
            <div className="results-count">
              {loading ? 'Loading...' : `${total.toLocaleString()} case${total !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        <div className="table-card">
          <DataTable
            columns={fraudColumns}
            data={fraudCases}
            loading={loading}
            pagination={{
              page,
              limit: 20,
              total,
              pages: totalPages,
            }}
            onPageChange={setPage}
            emptyMessage="No fraud cases found"
          />
        </div>
      </TabPanel>

      {/* Report Detail Dialog */}
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
        <DialogTitle style={{ color: '#fff' }}>Report Details</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Type</Typography>
                <Box mt={1}>{getTypeChip(selectedReport.type || selectedReport.subject || 'other')}</Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Severity</Typography>
                <Box mt={1}>{getSeverityChip(selectedReport.severity || 'medium')}</Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Reporter</Typography>
                <Typography variant="body1" color="#fff">
                  {selectedReport.reporter?.firstName} {selectedReport.reporter?.lastName}
                </Typography>
                <Typography variant="body2" color="#888">
                  {selectedReport.reporter?.phoneNumber || selectedReport.reporter_phone_number}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Reported User</Typography>
                <Typography variant="body1" color="#fff">
                  {selectedReport.reported?.firstName} {selectedReport.reported?.lastName}
                </Typography>
                <Typography variant="body2" color="#888">
                  {selectedReport.reported?.phoneNumber || selectedReport.reported_phone_number}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Reason</Typography>
                <Typography variant="body1" color="#fff">{selectedReport.reason || selectedReport.content}</Typography>
              </Grid>
              {(selectedReport.description || selectedReport.content) && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="#a0a0a0">Description</Typography>
                  <Typography variant="body1" color="#fff">{selectedReport.description || selectedReport.content}</Typography>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Current Status</Typography>
                <Box mt={1}>{getStatusChip(selectedReport.status || (selectedReport.reviewed ? 'resolved' : 'pending'))}</Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)} style={{ color: '#a0a0a0' }}>
            Close
          </Button>
          {(selectedReport?.status === 'pending' || (!selectedReport?.status && !selectedReport?.reviewed)) && (
            <Button 
              variant="contained" 
              style={{ background: '#2196f3' }}
              onClick={() => handleUpdateStatus('investigating')}
            >
              Start Investigation
            </Button>
          )}
          {(selectedReport?.status !== 'resolved' && selectedReport?.status !== 'dismissed') || (!selectedReport?.status && !selectedReport?.reviewed) ? (
            <>
              <Button 
                variant="contained" 
                style={{ background: '#22c55e' }}
                onClick={() => handleUpdateStatus('resolved')}
              >
                Mark Resolved
              </Button>
              <Button 
                variant="outlined" 
                style={{ color: '#a0a0a0', borderColor: '#2a2a2a' }}
                onClick={() => handleUpdateStatus('dismissed')}
              >
                Dismiss
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      {/* Fraud Case Detail Dialog */}
      <Dialog 
        open={fraudDetailDialogOpen} 
        onClose={() => setFraudDetailDialogOpen(false)} 
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
        <DialogTitle style={{ color: '#fff' }}>Fraud Case Details</DialogTitle>
        <DialogContent>
          {selectedFraudCase && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Case ID</Typography>
                <Typography variant="body1" color="#fff">{selectedFraudCase.caseId || selectedFraudCase._id}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Risk Score</Typography>
                <Box mt={1}>
                  <Chip
                    label={`${selectedFraudCase.riskScore || 0}/100`}
                    sx={{
                      background: selectedFraudCase.riskScore > 70 ? '#ef4444' : selectedFraudCase.riskScore > 40 ? '#f59e0b' : '#22c55e',
                      color: '#fff',
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="#a0a0a0">Description</Typography>
                <Typography variant="body1" color="#fff">{selectedFraudCase.description}</Typography>
              </Grid>
              {selectedFraudCase.evidence && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="#a0a0a0">Evidence</Typography>
                  <Typography variant="body1" color="#fff">{selectedFraudCase.evidence}</Typography>
                </Grid>
              )}
              {selectedFraudCase.user && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="#a0a0a0">Associated User</Typography>
                  <Typography variant="body1" color="#fff">
                    {selectedFraudCase.user.firstName} {selectedFraudCase.user.lastName}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFraudDetailDialogOpen(false)} style={{ color: '#a0a0a0' }}>
            Close
          </Button>
          {selectedFraudCase?.status !== 'resolved' && (
            <>
              <Button 
                variant="outlined" 
                style={{ color: '#2196f3', borderColor: '#2196f3' }}
                onClick={() => handleFraudAction('investigating')}
              >
                Investigate
              </Button>
              <Button 
                variant="contained" 
                style={{ background: '#ef4444' }}
                onClick={() => handleFraudAction('resolved', 'ban')}
              >
                Ban User
              </Button>
              <Button 
                variant="contained" 
                style={{ background: '#f59e0b' }}
                onClick={() => handleFraudAction('resolved', 'warn')}
              >
                Warn User
              </Button>
              <Button 
                variant="contained" 
                style={{ background: '#22c55e' }}
                onClick={() => handleFraudAction('resolved', 'dismiss')}
              >
                Dismiss Case
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Reports;
