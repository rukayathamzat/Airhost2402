import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Grid, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Property } from '../types/property';
import { fetchProperties, createProperty, updateProperty, deleteProperty } from '../services/property.service';

const Properties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');

  // Default AI instructions template
  const defaultAiInstructions = `Tu es un assistant virtuel qui gère les communications avec les invités de l'appartement.

Informations sur l'appartement :
- Nom: [Nom de l'appartement]
- Adresse: [Adresse complète]
- Description: [Description courte]

Spécificités de l'appartement :
- Équipements: [Liste des équipements importants]
- Règles de la maison: [Règles importantes à respecter]
- Informations du quartier: [Transports, commerces, restaurants à proximité]

Instructions pour les réponses :
- Réponds toujours de manière polie et professionnelle.
- Sois précis sur les détails spécifiques de l'appartement.
- Si tu ne connais pas la réponse, propose de transmettre la question au propriétaire.
- Pour les questions sur le check-in/check-out, réfère-toi aux dates de réservation.`;

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await fetchProperties();
      setProperties(data);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
      toast.error('Impossible de charger les propriétés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleOpenDialog = (property?: Property) => {
    if (property) {
      setCurrentProperty(property);
      setName(property.name);
      setAddress(property.address);
      setDescription(property.description || '');
      setAiInstructions(property.ai_instructions || '');
      setIsEditing(true);
    } else {
      setCurrentProperty(null);
      setName('');
      setAddress('');
      setDescription('');
      setAiInstructions(defaultAiInstructions);
      setIsEditing(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleOpenDeleteConfirm = (property: Property) => {
    setCurrentProperty(property);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
  };

  const handleSaveProperty = async () => {
    try {
      if (!name || !address) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (isEditing && currentProperty) {
        const updatedProperty = await updateProperty({
          ...currentProperty,
          name,
          address,
          description,
          ai_instructions: aiInstructions,
        });
        
        setProperties(properties.map(p => p.id === updatedProperty.id ? updatedProperty : p));
        toast.success('Appartement mis à jour avec succès');
      } else {
        const newProperty = await createProperty({
          host_id: '', // Sera remplacé par le service
          name,
          address,
          description,
          ai_instructions: aiInstructions,
          amenities: [],
          rules: [],
          faq: []
        });
        
        setProperties([...properties, newProperty]);
        toast.success('Appartement créé avec succès');
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'appartement:', error);
      toast.error('Impossible de sauvegarder l\'appartement');
    }
  };

  const handleDeleteProperty = async () => {
    try {
      if (!currentProperty) return;
      
      await deleteProperty(currentProperty.id);
      setProperties(properties.filter(p => p.id !== currentProperty.id));
      toast.success('Appartement supprimé avec succès');
      handleCloseDeleteConfirm();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'appartement:', error);
      toast.error('Impossible de supprimer l\'appartement');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Mes appartements
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Ajouter un appartement
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : properties.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="textSecondary">
            Vous n'avez pas encore d'appartements
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => handleOpenDialog()}
          >
            Ajouter votre premier appartement
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {property.name}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {property.address}
                  </Typography>
                  <Typography variant="body2" component="p" sx={{ mb: 2 }}>
                    {property.description || 'Aucune description'}
                  </Typography>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Instructions IA</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        {property.ai_instructions || 'Aucune instruction spécifique pour l\'IA'}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary" 
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(property)}
                  >
                    Modifier
                  </Button>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<DeleteIcon />}
                    onClick={() => handleOpenDeleteConfirm(property)}
                  >
                    Supprimer
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog pour ajouter/modifier un appartement */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Modifier l\'appartement' : 'Ajouter un appartement'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nom de l'appartement *"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exemple: Appartement Paris 9ème"
              required
            />
            <TextField
              label="Adresse *"
              variant="outlined"
              fullWidth
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse complète de l'appartement"
              required
            />
            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description détaillée de votre appartement"
            />
            <TextField
              label="Instructions pour l'IA"
              variant="outlined"
              fullWidth
              multiline
              rows={6}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Instructions spécifiques pour que l'IA réponde aux questions de vos invités"
              helperText="Ces instructions guideront l'IA dans ses réponses aux invités. Personnalisez ce modèle avec les détails spécifiques à votre appartement."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSaveProperty} variant="contained" color="primary">
            {isEditing ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'appartement "{currentProperty?.name}" ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Annuler</Button>
          <Button onClick={handleDeleteProperty} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Properties;
