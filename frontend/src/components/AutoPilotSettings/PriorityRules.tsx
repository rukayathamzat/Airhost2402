import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AutoPilotService } from '../../services/auto-pilot.service';

interface PriorityRule {
  keywords: string[];
  responseDelay: number;
}

interface PriorityRules {
  high: PriorityRule;
  medium: PriorityRule;
  low: PriorityRule;
}

interface PriorityRulesProps {
  propertyId: string;
  priorityRules: PriorityRules;
  onUpdate: () => void;
}

export default function PriorityRules({ propertyId, priorityRules, onUpdate }: PriorityRulesProps) {
  const [open, setOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<keyof PriorityRules>('medium');
  const [newKeyword, setNewKeyword] = useState('');
  const [newDelay, setNewDelay] = useState(0);

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const updatedRules = { ...priorityRules };
      updatedRules[selectedPriority].keywords = [
        ...updatedRules[selectedPriority].keywords,
        newKeyword.trim()
      ];
      updatedRules[selectedPriority].responseDelay = newDelay;

      await AutoPilotService.updateConfig(propertyId, { priorityRules: updatedRules });
      setNewKeyword('');
      setNewDelay(0);
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating priority rules:', error);
    }
  };

  const handleRemoveKeyword = async (priority: keyof PriorityRules, keyword: string) => {
    try {
      const updatedRules = { ...priorityRules };
      updatedRules[priority].keywords = updatedRules[priority].keywords.filter(k => k !== keyword);

      await AutoPilotService.updateConfig(propertyId, { priorityRules: updatedRules });
      onUpdate();
    } catch (error) {
      console.error('Error removing keyword:', error);
    }
  };

  const getPriorityColor = (priority: keyof PriorityRules) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Priority Rules</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Priority Rule
        </Button>
      </Box>

      {Object.entries(priorityRules).map(([priority, rule]) => (
        <Box
          key={priority}
          sx={{
            p: 2,
            mb: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1, textTransform: 'capitalize' }}>
            {priority} Priority
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Response Delay: {rule.responseDelay} minutes
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {rule.keywords.map(keyword => (
              <Chip
                key={keyword}
                label={keyword}
                color={getPriorityColor(priority as keyof PriorityRules)}
                onDelete={() => handleRemoveKeyword(priority as keyof PriorityRules, keyword)}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
        </Box>
      ))}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Priority Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Priority Level</InputLabel>
              <Select
                value={selectedPriority}
                label="Priority Level"
                onChange={(e) => setSelectedPriority(e.target.value as keyof PriorityRules)}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Keyword"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="Response Delay (minutes)"
              value={newDelay}
              onChange={(e) => setNewDelay(Number(e.target.value))}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddKeyword}
            variant="contained"
            disabled={!newKeyword.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 