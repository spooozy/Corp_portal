import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Box, Typography, Paper, Button, Divider, TextField, Chip, Grid 
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const getRoleName = (role) => {
  switch(role) {
    case 4: return 'Создатель (Super Admin)';
    case 3: return 'Администратор';
    case 2: return 'Руководитель команды';
    case 1: return 'Сотрудник';
    default: return 'Пользователь';
  }
};

export default function Profile() {
  const { user, logout, checkUser } = useAuth();
  const navigate = useNavigate();
  
  const [inviteLink, setInviteLink] = useState('');

  const handleGenerateInvite = async () => {
    try {
      const { data } = await api.post('/invites', { max_uses: 1 });
      setInviteLink(data.link);
      toast.success('Ссылка сгенерирована!');
    } catch (e) {
      toast.error('Ошибка создания ссылки');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Скопировано в буфер');
  };

  const handleLeaveOrg = async () => {
    if (!window.confirm('Вы уверены, что хотите выйти из организации?')) return;
    try {
      await api.post('/profile/leave');
      toast.success('Вы покинули организацию');
      await checkUser();
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt('Введите "DELETE" чтобы удалить аккаунт навсегда:');
    if (confirmText !== 'DELETE') return;

    try {
      await api.delete('/profile');
      toast.success('Аккаунт удален');
      logout();
      navigate('/login');
    } catch (e) {
      toast.error(e.response?.data?.error);
    }
  };

  const canInvite = user?.role >= 3;
  const canLeave = user?.organization_id && user?.role !== 4;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Личный кабинет</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Мои данные</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="ФИО" value={user.full_name} InputProps={{ readOnly: true }} />
              <TextField label="Email" value={user.email} InputProps={{ readOnly: true }} />
              <Box>
                <Typography variant="caption">Роль:</Typography><br/>
                <Chip label={getRoleName(user.role)} color="primary" variant="outlined" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {canInvite && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, backgroundColor: '#f0f4f8' }}>
              <Typography variant="h6" gutterBottom>Пригласить сотрудника</Typography>
              <Typography variant="body2" paragraph>
                Сгенерируйте уникальную ссылку и отправьте её сотруднику.
              </Typography>
              
              <Button variant="contained" onClick={handleGenerateInvite}>
                Сгенерировать ссылку
              </Button>

              {inviteLink && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'white', border: '1px solid #ccc', borderRadius: 1 }}>
                  <Typography variant="caption" display="block">Ссылка:</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontWeight: 'bold' }}>
                    {inviteLink}
                  </Typography>
                  <Button size="small" onClick={copyLink} sx={{ mt: 1 }}>
                    Копировать
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 3, mt: 2, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
            <Typography variant="h6" color="error" gutterBottom>Опасная зона</Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {canLeave && (
                <Button variant="outlined" color="warning" onClick={handleLeaveOrg}>
                  Выйти из организации
                </Button>
              )}
              
              <Button variant="outlined" color="error" onClick={handleDeleteAccount}>
                Удалить аккаунт
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}