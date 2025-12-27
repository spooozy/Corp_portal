import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, FormControlLabel, Switch, Box, 
  Typography, Alert, Autocomplete, Chip, useTheme, alpha 
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useAuth } from '../context/AuthContext';

export default function CreateNewsModal({ open, onClose, onSuccess, initialData = null }) {
  const { user } = useAuth();
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main;

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
      const headers = { 'Authorization': `Bearer ${token}` };

      fetch('http://localhost:8080/api/tags', { headers })
        .then(res => res.json())
        .then(data => setAvailableTags(data || []))
        .catch(err => console.error("Ошибка загрузки тегов", err));

      if (isAdminPlus) {
        fetch('http://localhost:8080/api/teamsIn', { headers })
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
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm" 
      PaperProps={{ 
        sx: { 
          borderRadius: '12px', 
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          border: '1px solid',
          borderColor: 'divider'
        } 
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pt: 3, letterSpacing: '-0.02em' }}>
        {isEdit ? 'Редактировать новость' : 'Создать новость'}
      </DialogTitle>
      
      <DialogContent sx={{ pb: 1 }}>
        {error && <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}

        <TextField
          autoFocus margin="dense" label="Заголовок" name="title" fullWidth required
          variant="outlined" value={formData.title} onChange={handleChange} 
          sx={{ mb: 2.5 }}
          InputProps={{ sx: { borderRadius: '8px' } }}
        />
        
        <TextField
          margin="dense" label="Текст новости" name="content" fullWidth required multiline minRows={5}
          variant="outlined" value={formData.content} onChange={handleChange} 
          sx={{ mb: 2.5 }}
          InputProps={{ sx: { borderRadius: '8px' } }}
        />

        <Autocomplete
          multiple
          options={availableTags}
          getOptionLabel={(option) => option.name || ""}
          value={formData.selectedTags}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, newValue) => setFormData(p => ({ ...p, selectedTags: newValue }))}
          sx={{ mb: 2.5 }}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Теги" placeholder="Добавить теги..." />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip 
                  key={key} 
                  label={`#${option.name}`} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    borderRadius: '4px', 
                    borderColor: alpha(ACCENT_COLOR, 0.3),
                    color: ACCENT_COLOR,
                    fontWeight: 600,
                    bgcolor: alpha(ACCENT_COLOR, 0.05)
                  }} 
                  {...tagProps} 
                />
              );
            })
          }
        />
        <Box 
          sx={{ 
            mb: 3, 
            border: '1px dashed', 
            borderColor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.3) : 'divider', 
            borderRadius: '12px', 
            p: 3, 
            textAlign: 'center',
            bgcolor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.02) : '#fafafa',
            transition: '0.2s',
            '&:hover': {
              borderColor: ACCENT_COLOR,
              bgcolor: alpha(ACCENT_COLOR, 0.05)
            }
          }}
        >
            <input
                accept="image/*" style={{ display: 'none' }} id="news-image-upload" type="file"
                onChange={(e) => setFormData(p => ({ ...p, imageFile: e.target.files[0] }))}
            />
            <label htmlFor="news-image-upload">
                <Button 
                  variant="text" 
                  component="span" 
                  startIcon={<CloudUploadOutlinedIcon />}
                  sx={{ 
                    color: 'text.primary', 
                    textTransform: 'none', 
                    fontWeight: 600,
                    '&:hover': { bgcolor: 'transparent' } 
                  }}
                >
                    {formData.imageFile ? formData.imageFile.name : (isEdit ? "Заменить обложку" : "Загрузить обложку")}
                </Button>
            </label>
        </Box>

        <Box 
          sx={{ 
            p: 2, 
            borderRadius: '12px', 
            border: '1px solid', 
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fafafa' 
          }}
        >
            <FormControlLabel
                control={
                  <Switch 
                    checked={formData.for_team} 
                    onChange={handleChange} 
                    name="for_team" 
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT_COLOR },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT_COLOR },
                    }}
                  />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>Опубликовать для команды</Typography>}
            />
            
            {formData.for_team && isAdminPlus && (
                <Autocomplete
                    sx={{ mt: 2 }}
                    size="small"
                    options={availableTeams}
                    getOptionLabel={(option) => option.name || ""}
                    value={availableTeams.find(t => t.id === formData.selectedTeam?.id) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, newValue) => setFormData(p => ({ ...p, selectedTeam: newValue }))}
                    renderInput={(params) => <TextField {...params} label="Выберите целевую команду" variant="outlined" />}
                />
            )}

            {formData.for_team && !isAdminPlus && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, pl: 1 }}>
                    * Новость будет видна только участникам вашей команды.
                </Typography>
            )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
          Отмена
        </Button>
        <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disableElevation
            disabled={loading || (user?.role < 2 && !formData.for_team)}
            startIcon={loading ? null : (isEdit ? <SaveOutlinedIcon /> : <SendOutlinedIcon />)}
            sx={{ 
              bgcolor: ACCENT_COLOR, 
              borderRadius: '8px', 
              textTransform: 'none', 
              fontWeight: 700,
              px: 3,
              '&:hover': { bgcolor: alpha(ACCENT_COLOR, 0.8) }
            }}
        >
          {loading ? 'Загрузка...' : (isEdit ? 'Сохранить' : 'Опубликовать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}