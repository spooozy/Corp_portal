import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, FormControlLabel, Switch, Box, 
  Typography, Alert, Autocomplete, Chip 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../context/AuthContext';

export default function CreateNewsModal({ open, onClose, onSuccess, initialData = null }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  const isEdit = !!initialData;

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

      if (initialData) {
        setFormData({
          title: initialData.title || '',
          content: initialData.content || '',
          selectedTags: initialData.tags || [],
          imageFile: null,
          for_team: !!initialData.team_id
        });
      } else {
        setFormData({ title: '', content: '', selectedTags: [], imageFile: null, for_team: false });
      }
    }
  }, [open, initialData]);

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
      
      const url = isEdit 
        ? `http://localhost:8080/api/news/${initialData.id}` 
        : 'http://localhost:8080/api/news';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: data 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении');
      }

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
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        {isEdit ? 'Редактировать новость' : 'Создать новость'}
      </DialogTitle>
      
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
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(event, newValue) => {
            setFormData(prev => ({ ...prev, selectedTags: newValue }));
          }}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Теги" placeholder="Выберите теги" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return <Chip key={key} label={option.name} size="small" {...tagProps} />;
            })
          }
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
                    {formData.imageFile 
                      ? formData.imageFile.name 
                      : (isEdit && initialData.image_url ? "Заменить обложку" : "Загрузить обложку")
                    }
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
            variant="contained" 
            color={isEdit ? "primary" : "secondary"}
            disabled={loading || (!canPostGlobal && !formData.for_team)}
            endIcon={loading ? null : (isEdit ? <SaveIcon /> : <SendIcon />)}
        >
          {loading ? 'Загрузка...' : (isEdit ? 'Сохранить' : 'Опубликовать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}