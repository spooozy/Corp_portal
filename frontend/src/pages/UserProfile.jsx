import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AvatarUpload from '../components/AvatarUpload';
import api from '../utils/api';
import { 
  Box, Typography, Paper, Grid, TextField, Button, Chip, 
  Divider, Link as MuiLink, Stack, IconButton, Tooltip, Container, useTheme, alpha
} from '@mui/material';
import { toast } from 'react-hot-toast';

import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import InfoIcon from '@mui/icons-material/Info';

const InfoRow = ({ icon, label, value, isEditing, editComponent }) => (
  <Box sx={{ 
    p: 2, 
    borderRadius: 2, 
    bgcolor: 'background.paper', 
    border: '1px solid',
    borderColor: 'divider',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: 'primary.light',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }
  }}>
    <Box display="flex" alignItems="flex-start" gap={2}>
      <Box sx={{ 
        p: 1, 
        borderRadius: '50%', 
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), 
        color: 'primary.main',
        display: 'flex'
      }}>
        {icon}
      </Box>
      <Box flexGrow={1}>
        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        {isEditing && editComponent ? (
          <Box mt={1}>{editComponent}</Box>
        ) : (
          <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
            {value || <span style={{ color: '#ccc' }}>Не указано</span>}
          </Typography>
        )}
      </Box>
    </Box>
  </Box>
);

const getRoleName = (role) => {
  switch(role) {
    case 4: return 'Создатель (Super Admin)';
    case 3: return 'Администратор';
    case 2: return 'Руководитель';
    case 1: return 'Сотрудник';
    default: return 'Пользователь';
  }
};

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser, checkUser, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const isMyProfile = !id || (currentUser && parseInt(id) === currentUser.id);
  const targetId = id || currentUser?.id;
  const isAdmin = currentUser?.role >= 3;
  const canEdit = isMyProfile || isAdmin;

  useEffect(() => {
    if (targetId) loadProfile();
  }, [targetId]);

  const loadProfile = async () => {
    try {
      const endpoint = isMyProfile && !id ? '/me' : `/users/${targetId}`;
      const { data } = await api.get(endpoint);
      setProfile(data);
      setFormData({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        bio: data.bio || '',
        team_id: data.team_id || 0,
        role: data.role
      });
    } catch (e) {
      toast.error('Ошибка загрузки профиля');
    }
  };

  const handleSave = async () => {
    try {
      const dataToSend = new FormData();
      dataToSend.append('full_name', formData.full_name || '');
      dataToSend.append('bio', formData.bio || '');
      dataToSend.append('phone', formData.phone || '');
      
      if (isAdmin) {
        dataToSend.append('team_id', formData.team_id?.toString() || '0');
        dataToSend.append('role', formData.role?.toString() || '1');
      }
      for (let pair of dataToSend.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }
      
      await api.put(`/users/${profile.id}`, dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success('Профиль обновлен');
      setIsEditing(false);
      loadProfile();
      if (isMyProfile) checkUser();
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      console.error('Ответ сервера:', e.response?.data);
      toast.error(e.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleLeaveOrg = async () => {
    if (!window.confirm('Вы действительно хотите выйти из организации?')) return;
    try {
      await api.post('/profile/leave');
      toast.success('Вы покинули организацию');
      await checkUser();
      navigate('/');
    } catch (e) { toast.error(e.response?.data?.error); }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt('Напишите "DELETE" чтобы удалить аккаунт навсегда:');
    if (confirmText !== 'DELETE') return;
    try {
      await api.delete('/profile');
      toast.success('Аккаунт удален');
      logout();
      navigate('/login');
    } catch (e) { toast.error(e.response?.data?.error); }
  };

  if (!profile) return <Container sx={{ py: 4, textAlign: 'center' }}><Typography>Загрузка...</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3} justifyContent="center"
      sx={{
        flexWrap: { xs: 'wrap', md: 'nowrap' }
      }}
      >
        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: 4, 
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
              height: '100%',              
              maxWidth: { xs: '100%', md: '380px' },
              minWidth: { md: '300px' },
              background: 'linear-gradient(to bottom, #ffffff 0%, #fcfcfc 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            <Box mb={3} display="flex" justifyContent="center">
              <AvatarUpload 
                  currentAvatar={profile.avatar_url}
                  entityType="user"
                  entityId={profile.id}
                  editable={canEdit}
                  size={140}
                  onUpload={(newUrl) => setProfile(prev => ({ ...prev, avatar_url: newUrl }))}
              />
            </Box>

            <Typography variant="h5" fontWeight="800" gutterBottom color="text.primary">
              {profile.full_name}
            </Typography>
            
            <Chip 
              label={getRoleName(profile.role)} 
              color={profile.role >= 3 ? "secondary" : "default"}
              variant="filled"
              size="small"
              sx={{ mb: 4, fontWeight: 500 }} 
            />
            <Stack spacing={2} textAlign="left">
                <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.1)
                }}>
                    <Typography variant="caption" color="primary.main" fontWeight="bold">ОРГАНИЗАЦИЯ</Typography>
                    <Box display="flex" alignItems="center" gap={1.5} mt={1}>
                        <BusinessIcon color="primary" />
                        {profile.organization ? (
                            <MuiLink component={Link} to={`/organizations/${profile.organization_id}`} underline="hover" 
                                sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
                                {profile.organization.name}
                            </MuiLink>
                        ) : (
                            <Typography color="text.secondary" fontSize="0.9rem">Не состоит</Typography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: alpha(theme.palette.secondary.main, 0.05),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.secondary.main, 0.1)
                }}>
                    <Typography variant="caption" color="secondary.main" fontWeight="bold">КОМАНДА</Typography>
                    <Box display="flex" alignItems="center" gap={1.5} mt={1}>
                        <GroupsIcon color="secondary" />
                        {profile.team ? (
                            <MuiLink component={Link} to={`/teams/${profile.team_id}`} underline="hover" 
                                sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
                                {profile.team.name}
                            </MuiLink>
                        ) : (
                            <Typography color="text.secondary" fontSize="0.9rem">Без команды</Typography>
                        )}
                    </Box>
                </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: 4, 
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              display: 'flex', 
              flexDirection: 'column',
              maxWidth: { xs: '100%', md: '800px' },
              minWidth: { md: '600px' },
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
               <Box>
                   <Typography variant="h5" fontWeight="700">Личные данные</Typography>
                   <Typography variant="body2" color="text.secondary">Управление вашей информацией</Typography>
               </Box>
               
               {canEdit && (
                 <Box>
                   {!isEditing ? (
                       <Button 
                         startIcon={<EditIcon />} 
                         onClick={() => setIsEditing(true)}
                         variant="outlined"
                         sx={{ borderRadius: 2 }}
                       >
                         Редактировать
                       </Button>
                   ) : (
                     <Stack direction="row" spacing={1}>
                       <Button 
                         variant="outlined" 
                         color="error" 
                         onClick={() => setIsEditing(false)}
                         startIcon={<CancelIcon />}
                       >
                         Отмена
                       </Button>
                       <Button 
                         variant="contained" 
                         color="success" 
                         onClick={handleSave}
                         startIcon={<SaveIcon />}
                         sx={{ color: 'white' }}
                       >
                         Сохранить
                       </Button>
                     </Stack>
                   )}
                 </Box>
               )}
            </Box>
            <Stack spacing={2} sx={{ flexGrow: 1 }}>
              
              <InfoRow 
                icon={<BadgeIcon />}
                label="Полное имя"
                value={profile.full_name}
                isEditing={isEditing}
                editComponent={
                  <TextField fullWidth size="small" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                }
              />

              <InfoRow 
                icon={<EmailIcon />}
                label="Email адрес"
                value={profile.email}
                isEditing={false}
              />

              <InfoRow 
                icon={<PhoneIcon />}
                label="Телефон"
                value={profile.phone}
                isEditing={isEditing}
                editComponent={
                  <TextField fullWidth size="small" placeholder="+7..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                }
              />

              <InfoRow 
                icon={<InfoIcon />}
                label="О себе"
                value={profile.bio}
                isEditing={isEditing}
                editComponent={
                  <TextField fullWidth multiline rows={3} size="small" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                }
              />
              {isEditing && isAdmin && (
                 <Box sx={{ p: 2, border: '1px dashed orange', borderRadius: 2, mt: 2 }}>
                     <Typography variant="subtitle2" color="warning.main" gutterBottom>Системные поля</Typography>
                     <Stack direction="row" spacing={2}>
                        <TextField 
                            label="ID Команды" type="number" size="small"
                            value={formData.team_id}
                            onChange={e => setFormData({...formData, team_id: parseInt(e.target.value) || 0})}
                        />
                        <TextField 
                            label="Role ID" type="number" size="small"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: parseInt(e.target.value)})}
                        />
                     </Stack>
                 </Box>
              )}
            </Stack>
            {isMyProfile && !isEditing && (
              <Box mt={5}>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="overline" color="error" fontWeight="bold" display="block" mb={2}>
                  ОПАСНАЯ ЗОНА
                </Typography>
                <Grid container spacing={2}>
                  {profile.organization_id && profile.role !== 4 && (
                    <Grid item>
                        <Button 
                            variant="outlined" color="warning" 
                            startIcon={<LogoutIcon />} onClick={handleLeaveOrg}
                        >
                            Выйти из организации
                        </Button>
                    </Grid>
                  )}
                  {profile.role !== 4 && (
                    <Grid item>
                        <Button 
                            variant="outlined" color="error" 
                            startIcon={<DeleteForeverIcon />} onClick={handleDeleteAccount}
                        >
                            Удалить аккаунт
                        </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

