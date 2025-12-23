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
  const [availableTeams, setAvailableTeams] = useState([]);

  const isEdit = !!initialData;
  const isAdminPlus = user?.role >= 3;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    selectedTags: [],
    imageFile: null,
    for_team: false,
    selectedTeam: null
  });

  useEffect(() => {
    if (open) {
      const token = localStorage.getItem('token');

      fetch('http://localhost:8080/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setAvailableTags(data || []))
      .catch(err => console.error("Ошибка загрузки тегов", err));

      if (isAdminPlus) {
        fetch('http://localhost:8080/api/teamsIn', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setAvailableTeams(data || []))
        .catch(err => console.error("Ошибка загрузки команд", err));
      }
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          content: initialData.content || '',
          selectedTags: initialData.tags || [],
          imageFile: null,
          for_team: !!initialData.team_id,
          selectedTeam: initialData.team_id ? { id: initialData.team_id } : null
        });
      } else {
        setFormData({ title: '', content: '', selectedTags: [], imageFile: null, for_team: false, selectedTeam: null });
      }
    }
  }, [open, initialData, isAdminPlus]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

      if (isAdminPlus && formData.for_team && formData.selectedTeam) {
        data.append('target_team_id', formData.selectedTeam.id);
      }

      const token = localStorage.getItem('token');
      const url = isEdit 
        ? `http://localhost:8080/api/news/${initialData.id}` 
        : 'http://localhost:8080/api/news';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data 
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка сохранения');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          getOptionLabel={(option) => option.name || ""}
          value={formData.selectedTags}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, newValue) => setFormData(p => ({ ...p, selectedTags: newValue }))}
          renderInput={(params) => <TextField {...params} variant="outlined" label="Теги" />}
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
                accept="image/*" style={{ display: 'none' }} id="news-image-upload" type="file"
                onChange={(e) => setFormData(p => ({ ...p, imageFile: e.target.files[0] }))}
            />
            <label htmlFor="news-image-upload">
                <Button variant="text" component="span" startIcon={<CloudUploadIcon />}>
                    {formData.imageFile ? formData.imageFile.name : (isEdit ? "Заменить обложку" : "Загрузить обложку")}
                </Button>
            </label>
        </Box>

        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <FormControlLabel
                control={<Switch checked={formData.for_team} onChange={handleChange} name="for_team" />}
                label={<Typography variant="body2" fontWeight="bold">Для конкретной команды</Typography>}
            />
            {formData.for_team && isAdminPlus && (
                <Autocomplete
                    sx={{ mt: 2 }}
                    size="small"
                    options={availableTeams}
                    getOptionLabel={(option) => option.name || ""}
                    value={availableTeams.find(t => t.id === formData.selectedTeam?.id) || null}
                    onChange={(_, newValue) => setFormData(p => ({ ...p, selectedTeam: newValue }))}
                    renderInput={(params) => <TextField {...params} label="Выберите целевую команду" variant="outlined" />}
                />
            )}

            {formData.for_team && !isAdminPlus && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    * Новость будет опубликована для вашей текущей команды.
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
            disabled={loading || (user?.role < 2 && !formData.for_team)}
            endIcon={loading ? null : (isEdit ? <SaveIcon /> : <SendIcon />)}
        >
          {loading ? 'Загрузка...' : (isEdit ? 'Сохранить' : 'Опубликовать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}