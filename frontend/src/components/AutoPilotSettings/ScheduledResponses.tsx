import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AutoPilotService } from '../../services/auto-pilot.service';

interface ScheduledResponse {
  id: string;
  time: string;
  message: string;
  days: number[];
  enabled: boolean;
}

interface ScheduledResponsesProps {
  propertyId: string;
  scheduledResponses: ScheduledResponse[];
  onUpdate: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function ScheduledResponses({ propertyId, scheduledResponses, onUpdate }: ScheduledResponsesProps) {
  const [open, setOpen] = useState(false);
  const [newResponse, setNewResponse] = useState<Omit<ScheduledResponse, 'id'>>({
    time: '09:00',
    message: '',
    days: [],
    enabled: true
  });

  const handleAddResponse = async () => {
    try {
      await AutoPilotService.addScheduledResponse(propertyId, newResponse);
      setNewResponse({
        time: '09:00',
        message: '',
        days: [],
        enabled: true
      });
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding scheduled response:', error);
    }
  };

  const handleRemoveResponse = async (id: string) => {
    try {
      await AutoPilotService.removeScheduledResponse(propertyId, id);
      onUpdate();
    } catch (error) {
      console.error('Error removing scheduled response:', error);
    }
  };

  const handleDayToggle = (day: number) => {
    setNewResponse(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Scheduled Responses</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Scheduled Response
        </Button>
      </Box>

      {scheduledResponses.map(response => (
        <Box
          key={response.id}
          sx={{
            p: 2,
            mb: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography variant="subtitle1">
              {response.time} - {response.enabled ? 'Enabled' : 'Disabled'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {response.message}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {response.days.map(day => (
                <Chip
                  key={day}
                  label={DAYS_OF_WEEK[day]}
                  size="small"
                  sx={{ mr: 0.5 }}
                />
              ))}
            </Box>
          </Box>
          <IconButton
            onClick={() => handleRemoveResponse(response.id)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Scheduled Response</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="time"
              label="Time"
              value={newResponse.time}
              onChange={(e) => setNewResponse({ ...newResponse, time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Message"
              value={newResponse.message}
              onChange={(e) => setNewResponse({ ...newResponse, message: e.target.value })}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Days of Week
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {DAYS_OF_WEEK.map((day, index) => (
                <Chip
                  key={day}
                  label={day}
                  onClick={() => handleDayToggle(index)}
                  color={newResponse.days.includes(index) ? 'primary' : 'default'}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={newResponse.enabled}
                  onChange={(e) => setNewResponse({ ...newResponse, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddResponse}
            variant="contained"
            disabled={!newResponse.message || newResponse.days.length === 0}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 