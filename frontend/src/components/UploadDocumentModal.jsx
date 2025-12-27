import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, FormControlLabel, Switch, Box, 
  Typography, Alert, Autocomplete, Chip, useTheme, alpha 
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useAuth } from '../context/AuthContext';

export default function UploadDocumentModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '', 
    description: '', 
    selectedTags: [], 
    file: null, 
    for_team: false,
    selectedTeam: null
  });

  const isAdminPlus = user?.role >= 3;

  useEffect(() => {
    if (open) {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      fetch('http://localhost:8080/api/tags', { headers })
        .then(res => res.json())
        .then(data => setAvailableTags(data || []))
        .catch(err => console.error("Ошибка тегов:", err));

      if (isAdminPlus) {
        fetch('http://localhost:8080/api/teamsIn', { headers })
          .then(res => res.json())
          .then(data => setAvailableTeams(data || []))
          .catch(err => console.error("Ошибка команд:", err));
      }
    }
  }, [open, isAdminPlus]);

  const handleSubmit = async () => {
    if (!formData.file) { setError("Выберите файл"); return; }
    if (formData.for_team && isAdminPlus && !formData.selectedTeam) {
        setError("Выберите команду из списка");
        return;
    }

    setLoading(true); 
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('for_team', formData.for_team);
      data.append('tags_ids', formData.selectedTags.map(t => t.id).join(','));
      data.append('file', formData.file);

      if (isAdminPlus && formData.for_team && formData.selectedTeam) {
          data.append('target_team_id', formData.selectedTeam.id);
      }

      const response = await fetch('http://localhost:8080/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: data
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка загрузки');
      
      setFormData({ title: '', description: '', selectedTags: [], file: null, for_team: false, selectedTeam: null });
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
        Загрузить документ
      </DialogTitle>
      
      <DialogContent sx={{ pb: 1 }}>
        {error && <Alert severity="error" variant="outlined" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}

        <TextField
          autoFocus margin="dense" label="Название документа" fullWidth required
          variant="outlined" value={formData.title} 
          onChange={(e) => setFormData({...formData, title: e.target.value})} 
          sx={{ mb: 2.5 }}
          InputProps={{ sx: { borderRadius: '8px' } }}
        />
        
        <TextField
          margin="dense" label="Краткое описание" fullWidth multiline rows={2}
          variant="outlined" value={formData.description} 
          onChange={(e) => setFormData({...formData, description: e.target.value})} 
          sx={{ mb: 2.5 }}
          InputProps={{ sx: { borderRadius: '8px' } }}
        />

        <Autocomplete
          multiple 
          options={availableTags} 
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={formData.selectedTags}
          onChange={(e, v) => setFormData({...formData, selectedTags: v})}
          sx={{ mb: 3 }}
          renderInput={(params) => <TextField {...params} label="Теги" placeholder="Добавить теги..." />}
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
                style={{ display: 'none' }} id="doc-upload-input" type="file"
                onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
            />
            <label htmlFor="doc-upload-input">
                <Button 
                  variant="text" 
                  component="span" 
                  startIcon={<CloudUploadOutlinedIcon />}
                  sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'transparent' } }}
                >
                    {formData.file ? formData.file.name : "Нажмите для выбора файла"}
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
                        onChange={(e) => setFormData({...formData, for_team: e.target.checked})} 
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT_COLOR },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT_COLOR },
                        }}
                    />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>Привязать к команде</Typography>}
            />

             {formData.for_team && isAdminPlus && (
                <Autocomplete
                    sx={{ mt: 2 }}
                    size="small"
                    options={availableTeams}
                    getOptionLabel={(option) => option.name || ""}
                    value={formData.selectedTeam}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, val) => setFormData({...formData, selectedTeam: val})}
                    renderInput={(params) => <TextField {...params} label="Выберите целевую команду" variant="outlined" />}
                />
            )}

             {!isAdminPlus && !formData.for_team && (
                <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 1, pl: 1, fontWeight: 500 }}>
                    * Требуются права администратора для общего доступа.
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
            disabled={loading || (!isAdminPlus && !formData.for_team)}
            sx={{ 
              bgcolor: ACCENT_COLOR, 
              borderRadius: '8px', 
              textTransform: 'none', 
              fontWeight: 700,
              px: 3,
              '&:hover': { bgcolor: alpha(ACCENT_COLOR, 0.8) }
            }}
        >
          {loading ? 'Загрузка...' : 'Загрузить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}