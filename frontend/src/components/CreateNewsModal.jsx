import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, FormControlLabel, Switch, Box, 
  Typography, Alert, Autocomplete 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../context/AuthContext';

export default function CreateNewsModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    selectedTags: [],
    imageFile: null,
    for_team: false
  });

  useEffect(() => {
    if (open) {
      fetch('http://localhost:8080/api/tags', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => setAvailableTags(data || []))
      .catch(err => console.error("Не удалось загрузить теги", err));
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, imageFile: e.target.files[0] }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('for_team', formData.for_team);
      const tagsIDs = formData.selectedTags.map(tag => tag.id).join(',');
      data.append('tags_ids', tagsIDs);

      if (formData.imageFile) {
        data.append('image', formData.imageFile);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/news', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при создании');
      }
      setFormData({ title: '', content: '', selectedTags: [], imageFile: null, for_team: false });
      onSuccess();
      onClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canPostGlobal = user?.role >= 3;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Создать новость</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          autoFocus margin="dense" label="Заголовок" name="title" fullWidth required
          variant="outlined" value={formData.title} onChange={handleChange} sx={{ mb: 2 }}
        />
        
        <TextField
          margin="dense" label="Текст новости" name="content" fullWidth required multiline minRows={4}
          variant="outlined" value={formData.content} onChange={handleChange} sx={{ mb: 2 }}
        />
        <Autocomplete
          multiple
          options={availableTags}
          getOptionLabel={(option) => option.name}
          value={formData.selectedTags}
          onChange={(event, newValue) => {
            setFormData(prev => ({ ...prev, selectedTags: newValue }));
          }}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Теги" placeholder="Выберите теги" />
          )}
          sx={{ mb: 2 }}
        />
        <Box sx={{ mb: 2, border: '1px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center' }}>
            <input
                accept="image/*"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
            />
            <label htmlFor="raised-button-file">
                <Button variant="text" component="span" startIcon={<CloudUploadIcon />}>
                    {formData.imageFile ? formData.imageFile.name : "Загрузить обложку"}
                </Button>
            </label>
        </Box>

        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <FormControlLabel
                control={
                    <Switch checked={formData.for_team} onChange={handleChange} name="for_team" />
                }
                label={<Typography variant="body2" fontWeight="bold">Только для моей команды</Typography>}
            />
             {!canPostGlobal && !formData.for_team && (
                <Typography variant="caption" color="error" display="block">
                    * Требуется роль администратора для общей ленты.
                </Typography>
            )}
        </Box>

      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Отмена</Button>
        <Button 
            onClick={handleSubmit} 
            variant="contained" color="secondary"
            disabled={loading || (!canPostGlobal && !formData.for_team)}
            endIcon={loading ? null : <SendIcon />}
        >
          {loading ? 'Загрузка...' : 'Опубликовать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}