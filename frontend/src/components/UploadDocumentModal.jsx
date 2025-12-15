import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, FormControlLabel, Switch, Box, 
  Typography, Alert, Autocomplete 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../context/AuthContext';

export default function UploadDocumentModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '', description: '', selectedTags: [], file: null, for_team: false
  });

  useEffect(() => {
    if (open) {
      fetch('http://localhost:8080/api/tags', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json()).then(data => setAvailableTags(data || []))
      .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.file) { setError("Выберите файл"); return; }
    setLoading(true); setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('for_team', formData.for_team);
      data.append('tags_ids', formData.selectedTags.map(t => t.id).join(','));
      data.append('file', formData.file);

      const response = await fetch('http://localhost:8080/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: data
      });

      if (!response.ok) throw new Error('Ошибка загрузки');
      
      setFormData({ title: '', description: '', selectedTags: [], file: null, for_team: false });
      onSuccess(); onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canPostGlobal = user?.role >= 3;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight="bold">Загрузить документ</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          autoFocus margin="dense" label="Название документа" fullWidth required
          value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} sx={{ mb: 2 }}
        />
        <TextField
          margin="dense" label="Краткое описание" fullWidth multiline rows={2}
          value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} sx={{ mb: 2 }}
        />

        <Autocomplete
          multiple options={availableTags} getOptionLabel={(o) => o.name}
          value={formData.selectedTags}
          onChange={(e, v) => setFormData({...formData, selectedTags: v})}
          renderInput={(params) => <TextField {...params} label="Теги" />}
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2, border: '1px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center' }}>
            <input
                style={{ display: 'none' }} id="doc-file" type="file"
                onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
            />
            <label htmlFor="doc-file">
                <Button variant="text" component="span" startIcon={<CloudUploadIcon />}>
                    {formData.file ? formData.file.name : "Выберите файл"}
                </Button>
            </label>
        </Box>

        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <FormControlLabel
                control={<Switch checked={formData.for_team} onChange={(e) => setFormData({...formData, for_team: e.target.checked})} />}
                label={<Typography variant="body2" fontWeight="bold">Только для команды</Typography>}
            />
             {!canPostGlobal && !formData.for_team && (
                <Typography variant="caption" color="error" display="block">Только администратор может загружать общие документы.</Typography>
            )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || (!canPostGlobal && !formData.for_team)}>Загрузить</Button>
      </DialogActions>
    </Dialog>
  );
}