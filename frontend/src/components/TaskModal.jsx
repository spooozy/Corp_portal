import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Button, MenuItem, Box, Typography, IconButton, Grid,
  Tooltip, Avatar
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../context/AuthContext';

export default function TaskModal({ open, onClose, task, onSuccess, teamId }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: ''
  });

  const userRole = Number(user?.role);
  const currentUserId = Number(user?.id);
  const targetTeamId = Number(teamId);
  const userTeamId = Number(user?.team_id);

  const isAdmin = userRole >= 2;
  
  const isTeamLeader = userRole === 1 && userTeamId === targetTeamId;

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
    if (!window.confirm("Удалить задачу?")) return;
    await fetch(`http://localhost:8080/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" fontWeight="bold">
            {task ? 'Детали задачи' : 'Новая задача'}
        </Typography>
        {task && canManage && (
            <Tooltip title="Удалить задачу">
                <IconButton onClick={handleDelete} color="error" size="small">
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <TextField
          label="Заголовок" fullWidth margin="dense" variant="outlined" size="small"
          disabled={!canManage}
          value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
          sx={{ mb: 1 }}
        />
        <TextField
          label="Описание" fullWidth margin="normal" multiline rows={3} size="small"
          disabled={!canManage}
          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
        />
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
                <TextField
                    select label="Приоритет" fullWidth size="small"
                    disabled={!canManage}
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                >
                    <MenuItem value="LOW">Низкий</MenuItem>
                    <MenuItem value="MEDIUM">Средний</MenuItem>
                    <MenuItem value="HIGH">Высокий</MenuItem>
                </TextField>
            </Grid>
            <Grid item xs={6}>
                <TextField
                    type="date" label="Дедлайн" fullWidth size="small" InputLabelProps={{ shrink: true }}
                    disabled={!canManage}
                    value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    select label="Исполнитель" fullWidth size="small"
                    value={formData.assignee_id} onChange={e => setFormData({...formData, assignee_id: e.target.value})}
                >
                    <MenuItem value=""><em>Не назначен</em></MenuItem>
                    {members.map(m => (
                        <MenuItem key={m.id} value={m.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar src={getImageUrl(m.avatar_url)} sx={{ width: 20, height: 20, fontSize: '0.6rem' }} />
                                <Typography variant="body2">{m.full_name}</Typography>
                            </Box>
                        </MenuItem>
                    ))}
                </TextField>
            </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #eee' }}>
        <Button onClick={onClose} color="inherit">Отмена</Button>
        {canManage && (
            <Button onClick={handleSave} variant="contained" disableElevation>
                {task ? 'Сохранить' : 'Создать'}
            </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}