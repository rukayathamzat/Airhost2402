import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Paper,
  Divider,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { AutoPilotService } from '../../services/auto-pilot.service';
import PriorityRules from './PriorityRules';
import ScheduledResponses from './ScheduledResponses';

interface PriorityRule {
  keywords: string[];
  responseDelay: number;
}

interface PriorityRules {
  high: PriorityRule;
  medium: PriorityRule;
  low: PriorityRule;
}

interface ScheduledResponse {
  id: string;
  time: string;
  message: string;
  days: number[];
  enabled: boolean;
}

interface AutoPilotSettingsProps {
  propertyId: string;
  open: boolean;
  onClose: () => void;
}

export default function AutoPilotSettings({ propertyId, open, onClose }: AutoPilotSettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '17:00' });
  const [dailyLimit, setDailyLimit] = useState(50);
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [priorityRules, setPriorityRules] = useState<PriorityRules>({
    high: { keywords: [], responseDelay: 0 },
    medium: { keywords: [], responseDelay: 30 },
    low: { keywords: [], responseDelay: 120 }
  });
  const [scheduledResponses, setScheduledResponses] = useState<ScheduledResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [propertyId]);

  const loadSettings = async () => {
    try {
      const config = await AutoPilotService.getConfig(propertyId);
      if (config) {
        setEnabled(config.isEnabled);
        setWorkingHours(config.workingHours);
        setDailyLimit(config.maxDailyResponses);
        setExcludedKeywords(config.excludedKeywords);
        setPriorityRules(config.priorityRules || {
          high: { keywords: [], responseDelay: 0 },
          medium: { keywords: [], responseDelay: 30 },
          low: { keywords: [], responseDelay: 120 }
        });
        setScheduledResponses(config.scheduledResponses || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
    }
  };

  const handleSave = async () => {
    try {
      await AutoPilotService.updateConfig(propertyId, {
        isEnabled: enabled,
        workingHours,
        maxDailyResponses: dailyLimit,
        excludedKeywords,
        priorityRules,
        scheduledResponses
      });
      setError(null);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !excludedKeywords.includes(newKeyword.trim())) {
      setExcludedKeywords([...excludedKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setExcludedKeywords(excludedKeywords.filter(k => k !== keyword));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Auto-Pilot Settings</DialogTitle>
      <DialogContent>
        <Paper sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              }
              label="Enable Auto-Pilot"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Working Hours
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="time"
                label="Start Time"
                value={workingHours.start}
                onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="time"
                label="End Time"
                value={workingHours.end}
                onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Daily Response Limit
            </Typography>
            <TextField
              type="number"
              label="Maximum responses per day"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Excluded Keywords
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Add keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <Button
                variant="contained"
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim()}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {excludedKeywords.map(keyword => (
                <Chip
                  key={keyword}
                  label={keyword}
                  onDelete={() => handleRemoveKeyword(keyword)}
                />
              ))}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <PriorityRules
            propertyId={propertyId}
            priorityRules={priorityRules}
            onUpdate={loadSettings}
          />

          <Divider sx={{ my: 3 }} />

          <ScheduledResponses
            propertyId={propertyId}
            scheduledResponses={scheduledResponses}
            onUpdate={loadSettings}
          />
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!enabled}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
} 