import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Button, MenuItem, Box, Typography, IconButton, Grid,
  Tooltip, Avatar, useTheme, alpha, Stack
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { useAuth } from '../context/AuthContext';

export default function TaskModal({ open, onClose, task, onSuccess, teamId }) {
  const { user } = useAuth();
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main;
  
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: ''
  });

  const userRole = Number(user?.role);
  const targetTeamId = Number(teamId);
  const userTeamId = Number(user?.team_id);

  const isAdmin = userRole >= 2;
  const isTeamLeader = userRole === 2 && userTeamId === targetTeamId;
  const canManage = isAdmin || isTeamLeader;

  useEffect(() => {
    if (open && targetTeamId) {
      fetch(`http://localhost:8080/api/teams/${targetTeamId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => setMembers(Array.isArray(data.members) ? data.members : []))
      .catch(() => setMembers([]));

      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'MEDIUM',
          assignee_id: task.assignee_id || '',
          due_date: task.due_date ? task.due_date.substring(0, 10) : ''
        });
      } else {
        setFormData({ title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: '' });
      }
    }
  }, [open, task, targetTeamId]);

  const getImageUrl = (path) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `http://localhost:8080${path.startsWith('/') ? path : '/' + path}`;
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return alert("Введите заголовок");
    
    const url = task ? `http://localhost:8080/api/tasks/${task.id}` : 'http://localhost:8080/api/tasks';
    const body = { 
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        team_id: targetTeamId,
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
    };

    const res = await fetch(url, {
      method: task ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(body)
    });

    if (res.ok) {
        onSuccess();
        onClose();
    } else {
        const err = await res.json();
        alert(err.error || "Ошибка сохранения");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить задачу безвозвратно?")) return;
    await fetch(`http://localhost:8080/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    onSuccess();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm" 
      PaperProps={{ 
        sx: { 
          borderRadius: '16px', 
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.05)'
        } 
      }}
    >
      <DialogTitle sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            {task ? 'Редактирование задачи' : 'Создание задачи'}
        </Typography>
        <Stack direction="row" spacing={1}>
          {task && canManage && (
              <Tooltip title="Удалить">
                  <IconButton onClick={handleDelete} size="small" sx={{ color: 'text.secondary', '&:hover': { color: '#f44336', bgcolor: 'error.50' } }}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
              </Tooltip>
          )}
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent sx={{ px: 3, py: 0 }}>
        <TextField
          label="Название" 
          fullWidth 
          margin="dense" 
          variant="outlined" 
          disabled={!canManage}
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})}
          sx={{ mb: 2.5, mt: 1 }}
          InputProps={{ sx: { borderRadius: '8px' } }}
        />
        
        <TextField
          label="Описание" 
          fullWidth 
          margin="normal" 
          multiline 
          rows={4} 
          disabled={!canManage}
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})}
          sx={{ mb: 3 }}
          InputProps={{ sx: { borderRadius: '8px' } }}
        />
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item size={6}>
                <TextField
                    select 
                    label="Приоритет" 
                    fullWidth
                    disabled={!canManage}
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    InputProps={{ sx: { borderRadius: '8px' } }}
                >
                    <MenuItem value="LOW">Низкий</MenuItem>
                    <MenuItem value="MEDIUM">Средний</MenuItem>
                    <MenuItem value="HIGH">Высокий</MenuItem>
                </TextField>
            </Grid>
            <Grid item size={6}>
                <TextField
                    type="date" 
                    label="Дедлайн" 
                    fullWidth 
                    InputLabelProps={{ shrink: true }}
                    disabled={!canManage}
                    value={formData.due_date} 
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                    InputProps={{ sx: { borderRadius: '8px' } }}
                />
            </Grid>
        </Grid>

        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.03) : '#fafafa', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Исполнитель
            </Typography>
            <TextField
                select 
                fullWidth 
                size="small"
                value={formData.assignee_id} 
                onChange={e => setFormData({...formData, assignee_id: e.target.value})}
                variant="standard"
                InputProps={{ disableUnderline: true, sx: { fontSize: '0.9rem' } }}
            >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">Не назначен</Typography>
                </MenuItem>
                {members.map(m => (
                    <MenuItem key={m.id} value={m.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar 
                              src={getImageUrl(m.avatar_url)} 
                              sx={{ 
                                width: 24, height: 24, fontSize: '0.7rem',
                                bgcolor: alpha(ACCENT_COLOR, 0.2),
                                color: ACCENT_COLOR,
                                border: '1px solid',
                                borderColor: alpha(ACCENT_COLOR, 0.1)
                              }} 
                            >
                              {m.full_name?.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{m.full_name}</Typography>
                        </Box>
                    </MenuItem>
                ))}
            </TextField>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
          Отмена
        </Button>
        {canManage && (
            <Button 
              onClick={handleSave} 
              variant="contained" 
              disableElevation
              sx={{ 
                bgcolor: ACCENT_COLOR, 
                borderRadius: '8px', 
                textTransform: 'none', 
                fontWeight: 700,
                px: 4,
                '&:hover': { bgcolor: alpha(ACCENT_COLOR, 0.8) }
              }}
            >
                {task ? 'Сохранить' : 'Создать'}
            </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}