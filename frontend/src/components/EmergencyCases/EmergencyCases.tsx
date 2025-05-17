import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  CardActions,
  AlertTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { supabase } from '../../lib/supabase';
import { UnknownQueryService, UnknownQueryResult } from '../../services/unknown-query.service';

interface EmergencyCase {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  severity: 'immediate' | 'urgent' | 'standard';
  response_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmergencyCasesProps {
  propertyId: string;
  open: boolean;
  onClose: () => void;
}

interface TestResult {
  emergency: {
    detected: boolean;
    severity: 'immediate' | 'urgent' | 'standard' | null;
    matchedCase: EmergencyCase | null;
    matchedKeywords: string[];
  } | null;
  unknown: UnknownQueryResult | null;
}

export default function EmergencyCases({ propertyId, open, onClose }: EmergencyCasesProps) {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCase, setEditingCase] = useState<EmergencyCase | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<TestResult>({
    emergency: null,
    unknown: null
  });
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<EmergencyCase>>({
    name: '',
    description: '',
    keywords: [],
    severity: 'standard',
    response_template: '',
    is_active: true
  });
  const [newKeyword, setNewKeyword] = useState('');

  const unknownQueryService = useMemo(() => UnknownQueryService.getInstance(), []);

  useEffect(() => {
    if (open) {
      loadCases();
    }
  }, [open, propertyId]);

  useEffect(() => {
    if (propertyId) {
      unknownQueryService.setPropertyId(propertyId);
    }
  }, [propertyId, unknownQueryService]);

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_cases')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading emergency cases:', error);
      setError('Failed to load emergency cases');
    }
  };

  const handleOpenDialog = (caseToEdit?: EmergencyCase) => {
    if (caseToEdit) {
      setEditingCase(caseToEdit);
      setFormData(caseToEdit);
    } else {
      setEditingCase(null);
      setFormData({
        name: '',
        description: '',
        keywords: [],
        severity: 'standard',
        response_template: '',
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCase(null);
    setFormData({
      name: '',
      description: '',
      keywords: [],
      severity: 'standard',
      response_template: '',
      is_active: true
    });
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !formData.keywords?.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || []
    }));
  };

  const handleSave = async () => {
    try {
      const caseData = {
        ...formData,
        property_id: propertyId,
        updated_at: new Date().toISOString()
      };

      if (editingCase) {
        const { error } = await supabase
          .from('emergency_cases')
          .update(caseData)
          .eq('id', editingCase.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('emergency_cases')
          .insert({
            ...caseData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      handleCloseDialog();
      loadCases();
    } catch (error) {
      console.error('Error saving emergency case:', error);
      setError('Failed to save emergency case');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_cases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCases();
    } catch (error) {
      console.error('Error deleting emergency case:', error);
      setError('Failed to delete emergency case');
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult({ emergency: null, unknown: null });
      setError(null);

      // Test emergency detection
      const lowerMessage = testMessage.toLowerCase();
      let emergencyResult = {
        detected: false,
        severity: null as 'immediate' | 'urgent' | 'standard' | null,
        matchedCase: null as EmergencyCase | null,
        matchedKeywords: [] as string[]
      };

      // Test against all active cases
      for (const case_ of cases.filter(c => c.is_active)) {
        const foundKeywords = case_.keywords.filter(keyword => 
          lowerMessage.includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
          emergencyResult = {
            detected: true,
            severity: case_.severity,
            matchedCase: case_,
            matchedKeywords: foundKeywords
          };
          break;
        }
      }

      // Test unknown query detection
      const unknownResult = await unknownQueryService.detectUnknownQuery(testMessage);

      setTestResult({
        emergency: emergencyResult,
        unknown: unknownResult
      });
    } catch (error) {
      console.error('Error testing message:', error);
      setError('Failed to test message');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Emergency Cases Management</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Emergency Cases</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add New Case
          </Button>
        </Box>

        <List>
          {cases.map(case_ => (
            <Paper key={case_.id} sx={{ mb: 2, p: 2 }}>
              <ListItem disablePadding>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">{case_.name}</Typography>
                      <Chip
                        size="small"
                        label={case_.severity}
                        color={
                          case_.severity === 'immediate' ? 'error' :
                          case_.severity === 'urgent' ? 'warning' : 'info'
                        }
                      />
                      {!case_.is_active && (
                        <Chip size="small" label="Inactive" color="default" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {case_.description}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {case_.keywords.map(keyword => (
                          <Chip
                            key={keyword}
                            label={keyword}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleOpenDialog(case_)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(case_.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Message Analysis
          </Typography>
          <Card>
            <CardContent>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Test Message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isTesting}
              />
              
              {testResult.emergency && (
                <Alert
                  severity={testResult.emergency.detected ? 'error' : 'success'}
                  sx={{ mb: 2 }}
                >
                  <AlertTitle>
                    {testResult.emergency.detected ? 'Emergency Detected' : 'No Emergency Detected'}
                  </AlertTitle>
                  {testResult.emergency.detected && (
                    <>
                      <Typography variant="body2">
                        Severity: {testResult.emergency.severity}
                      </Typography>
                      {testResult.emergency.matchedCase && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Matched case: {testResult.emergency.matchedCase.name}
                        </Typography>
                      )}
                      {testResult.emergency.matchedKeywords.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Matched keywords: {testResult.emergency.matchedKeywords.join(', ')}
                        </Typography>
                      )}
                    </>
                  )}
                </Alert>
              )}

              {testResult.unknown && (
                <Alert
                  severity={testResult.unknown.isUnknown ? 'warning' : 'success'}
                  sx={{ mb: 2 }}
                >
                  <AlertTitle>
                    {testResult.unknown.isUnknown ? 'Unknown Query Detected' : 'Query Understood'}
                  </AlertTitle>
                  <Typography variant="body2">
                    Confidence: {(testResult.unknown.confidence * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Reason: {testResult.unknown.reason}
                  </Typography>
                  {testResult.unknown.suggestedResponse && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Suggested Response:
                      </Typography>
                      <Typography variant="body2">
                        {testResult.unknown.suggestedResponse}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}

              {testResult.emergency && testResult.unknown && (
                <Alert
                  severity="info"
                  sx={{ mb: 2 }}
                >
                  <AlertTitle>Analysis Summary</AlertTitle>
                  <Typography variant="body2">
                    {testResult.emergency.detected && testResult.unknown.isUnknown
                      ? 'This message contains both an emergency situation and an unknown query. Please review both alerts carefully.'
                      : testResult.emergency.detected
                      ? 'This message requires immediate attention due to an emergency situation.'
                      : testResult.unknown.isUnknown
                      ? 'This message contains a query that may need clarification or additional context.'
                      : 'This message appears to be clear and understood, with no emergency situation detected.'}
                  </Typography>
                </Alert>
              )}
            </CardContent>
            <CardActions>
              <Button
                startIcon={<PlayArrowIcon />}
                onClick={handleTest}
                disabled={!testMessage.trim() || isTesting}
                variant="contained"
                color="primary"
              >
                {isTesting ? 'Analyzing...' : 'Test Message'}
              </Button>
            </CardActions>
          </Card>
        </Box>
      </DialogContent>

      {/* Dialog for adding/editing cases */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCase ? 'Edit Emergency Case' : 'Add Emergency Case'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Case Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={formData.severity}
                label="Severity"
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  severity: e.target.value as 'immediate' | 'urgent' | 'standard' 
                }))}
              >
                <MenuItem value="immediate">Immediate</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Response Template"
              value={formData.response_template}
              onChange={(e) => setFormData(prev => ({ ...prev, response_template: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Keywords
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  label="Add Keyword"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                />
                <Button onClick={handleAddKeyword}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {formData.keywords?.map(keyword => (
                  <Chip
                    key={keyword}
                    label={keyword}
                    onDelete={() => handleRemoveKeyword(keyword)}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name || !formData.description || !formData.response_template}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
} 