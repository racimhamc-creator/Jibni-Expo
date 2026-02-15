import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  TextField,
  Grid,
} from '@mui/material';
import { Visibility, CheckCircle, Flag, Gavel } from '@mui/icons-material';
import { adminAPI, Report } from '../services/api';

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

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [fraudCases, setFraudCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      await adminAPI.updateReportStatus(selectedReport._id, status);
      setReports(reports.map(r => 
        r._id === selectedReport._id ? { ...r, status } : r
      ));
      setDetailDialogOpen(false);
    } catch (err) {
      setError('Failed to update report status');
    }
  };

  const handleFraudAction = async (status: string, action?: string) => {
    if (!selectedFraudCase) return;
    
    try {
      await adminAPI.updateFraudCase(selectedFraudCase._id || selectedFraudCase.id, status, action);
      loadFraudCases();
      setFraudDetailDialogOpen(false);
    } catch (err) {
      setError('Failed to update fraud case');
    }
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, any> = {
      pending: { color: 'warning', label: 'Pending' },
      investigating: { color: 'info', label: 'Investigating' },
      resolved: { color: 'success', label: 'Resolved' },
      dismissed: { color: 'default', label: 'Dismissed' },
    };
    const config = colors[status] || { color: 'default', label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getSeverityChip = (severity: string) => {
    const colors: Record<string, any> = {
      low: { color: 'success', label: 'Low' },
      medium: { color: 'warning', label: 'Medium' },
      high: { color: 'error', label: 'High' },
      critical: { color: 'error', label: 'Critical', variant: 'filled' },
    };
    const config = colors[severity] || { color: 'default', label: severity };
    return <Chip label={config.label} color={config.color} size="small" variant={config.variant || 'outlined'} />;
  };

  const getTypeChip = (type: string) => {
    const colors: Record<string, any> = {
      user: { color: 'info', label: 'User' },
      mission: { color: 'primary', label: 'Mission' },
      fraud: { color: 'error', label: 'Fraud' },
      other: { color: 'default', label: 'Other' },
    };
    const config = colors[type] || { color: 'default', label: type };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Reports & Fraud Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
        <Tab label="Reports" icon={<Flag />} iconPosition="start" />
        <Tab label="Fraud Detection" icon={<Gavel />} iconPosition="start" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="investigating">Investigating</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="dismissed">Dismissed</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="mission">Mission</MenuItem>
                  <MenuItem value="fraud">Fraud</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Reporter</TableCell>
                    <TableCell>Reported</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
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
                  ) : reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell>{getTypeChip(report.type)}</TableCell>
                        <TableCell>
                          {report.reporter?.firstName} {report.reporter?.lastName}
                        </TableCell>
                        <TableCell>
                          {report.reported?.firstName} {report.reported?.lastName}
                        </TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>{getSeverityChip(report.severity)}</TableCell>
                        <TableCell>{getStatusChip(report.status)}</TableCell>
                        <TableCell>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => openDetailDialog(report)}>
                            <Visibility />
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
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Fraud Cases Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Case ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
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
                  ) : fraudCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No fraud cases found
                      </TableCell>
                    </TableRow>
                  ) : (
                    fraudCases.map((fraudCase) => (
                      <TableRow key={fraudCase._id || fraudCase.id}>
                        <TableCell>{fraudCase.caseId || fraudCase._id}</TableCell>
                        <TableCell>{getTypeChip(fraudCase.type)}</TableCell>
                        <TableCell>
                          {fraudCase.user?.firstName} {fraudCase.user?.lastName}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${fraudCase.riskScore || 0}/100`}
                            color={fraudCase.riskScore > 70 ? 'error' : fraudCase.riskScore > 40 ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{getStatusChip(fraudCase.status)}</TableCell>
                        <TableCell>
                          {new Date(fraudCase.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => openFraudDetailDialog(fraudCase)}>
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Report Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Details</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                <Box mt={1}>{getTypeChip(selectedReport.type)}</Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Severity</Typography>
                <Box mt={1}>{getSeverityChip(selectedReport.severity)}</Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Reporter</Typography>
                <Typography variant="body1">
                  {selectedReport.reporter?.firstName} {selectedReport.reporter?.lastName}
                </Typography>
                <Typography variant="body2">{selectedReport.reporter?.phoneNumber}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Reported User</Typography>
                <Typography variant="body1">
                  {selectedReport.reported?.firstName} {selectedReport.reported?.lastName}
                </Typography>
                <Typography variant="body2">{selectedReport.reported?.phoneNumber}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
                <Typography variant="body1">{selectedReport.reason}</Typography>
              </Grid>
              {selectedReport.description && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                  <Typography variant="body1">{selectedReport.description}</Typography>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="textSecondary">Current Status</Typography>
                <Box mt={1}>{getStatusChip(selectedReport.status)}</Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          {selectedReport?.status === 'pending' && (
            <Button variant="contained" color="info" onClick={() => handleUpdateStatus('investigating')}>
              Start Investigation
            </Button>
          )}
          {selectedReport?.status !== 'resolved' && selectedReport?.status !== 'dismissed' && (
            <>
              <Button variant="contained" color="success" onClick={() => handleUpdateStatus('resolved')}>
                Mark Resolved
              </Button>
              <Button variant="outlined" onClick={() => handleUpdateStatus('dismissed')}>
                Dismiss
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Fraud Case Detail Dialog */}
      <Dialog open={fraudDetailDialogOpen} onClose={() => setFraudDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Fraud Case Details</DialogTitle>
        <DialogContent>
          {selectedFraudCase && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Case ID</Typography>
                <Typography variant="body1">{selectedFraudCase.caseId || selectedFraudCase._id}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Risk Score</Typography>
                <Chip
                  label={`${selectedFraudCase.riskScore || 0}/100`}
                  color={selectedFraudCase.riskScore > 70 ? 'error' : selectedFraudCase.riskScore > 40 ? 'warning' : 'success'}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body1">{selectedFraudCase.description}</Typography>
              </Grid>
              {selectedFraudCase.evidence && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="textSecondary">Evidence</Typography>
                  <Typography variant="body1">{selectedFraudCase.evidence}</Typography>
                </Grid>
              )}
              {selectedFraudCase.user && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="textSecondary">Associated User</Typography>
                  <Typography variant="body1">
                    {selectedFraudCase.user.firstName} {selectedFraudCase.user.lastName}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFraudDetailDialogOpen(false)}>Close</Button>
          {selectedFraudCase?.status !== 'resolved' && (
            <>
              <Button variant="outlined" onClick={() => handleFraudAction('investigating')}>
                Investigate
              </Button>
              <Button variant="contained" color="error" onClick={() => handleFraudAction('resolved', 'ban')}>
                Ban User
              </Button>
              <Button variant="contained" color="warning" onClick={() => handleFraudAction('resolved', 'warn')}>
                Warn User
              </Button>
              <Button variant="contained" color="success" onClick={() => handleFraudAction('resolved', 'dismiss')}>
                Dismiss Case
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
