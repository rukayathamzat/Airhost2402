import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { supabase } from '../../lib/supabase';

interface EmergencyLog {
  id: string;
  property_id: string;
  emergency_case_id: string;
  message: string;
  matched_keywords: string[];
  detected_at: string;
  notification_sent: boolean;
  notification_sent_at: string | null;
  notification_status: 'pending' | 'sent' | 'failed' | null;
  notification_error: string | null;
  emergency_case: {
    name: string;
    severity: 'immediate' | 'urgent' | 'standard';
    description: string;
  };
}

interface EmergencyLogsProps {
  propertyId: string;
}

export default function EmergencyLogs({ propertyId }: EmergencyLogsProps) {
  const [logs, setLogs] = useState<EmergencyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, [propertyId, page, rowsPerPage, severityFilter, statusFilter, dateRange, searchQuery]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('emergency_detection_logs')
        .select(`
          *,
          emergency_case:emergency_cases(name, severity, description)
        `, { count: 'exact' })
        .eq('property_id', propertyId)
        .order('detected_at', { ascending: false });

      // Apply filters
      if (severityFilter !== 'all') {
        query = query.eq('emergency_case.severity', severityFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('notification_status', statusFilter);
      }

      if (dateRange.start) {
        query = query.gte('detected_at', dateRange.start.toISOString());
      }

      if (dateRange.end) {
        query = query.lte('detected_at', dateRange.end.toISOString());
      }

      if (searchQuery) {
        query = query.or(`message.ilike.%${searchQuery}%,emergency_case.name.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      query = query.range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading emergency logs:', error);
      setError('Failed to load emergency logs');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    loadLogs();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'immediate':
        return 'error';
      case 'urgent':
        return 'warning';
      case 'standard':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              value={severityFilter}
              label="Severity"
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value="immediate">Immediate</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="standard">Standard</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={dateRange.start}
              onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={dateRange.end}
              onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in messages or case names..."
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Case</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Keywords</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {new Date(log.detected_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Tooltip title={log.emergency_case.description}>
                    <Typography variant="body2">
                      {log.emergency_case.name}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.emergency_case.severity}
                    color={getSeverityColor(log.emergency_case.severity)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {log.message}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {log.matched_keywords.map((keyword) => (
                      <Chip
                        key={keyword}
                        label={keyword}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  {log.notification_status && (
                    <Chip
                      label={log.notification_status}
                      color={getStatusColor(log.notification_status)}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title={
                    log.notification_error
                      ? `Error: ${log.notification_error}`
                      : log.notification_sent_at
                      ? `Sent at: ${new Date(log.notification_sent_at).toLocaleString()}`
                      : 'No additional details'
                  }>
                    <IconButton size="small">
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No emergency logs found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
} 