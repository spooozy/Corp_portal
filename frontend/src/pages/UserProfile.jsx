import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AvatarUpload from '../components/AvatarUpload';
import api from '../utils/api';
import { 
  Box, Typography, Paper, Grid, TextField, Button, Chip, 
  Divider, Link as MuiLink, Stack, IconButton, Tooltip, Container, alpha, useTheme
} from '@mui/material';
import { toast } from 'react-hot-toast';

import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';


const InfoRow = ({ icon, label, value, isEditing, editComponent }) => {
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main; 
  return (
    <Box sx={{ 
      py: 2.5, 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: 3,
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' }
    }}>
      <Box sx={{ 
        p: 1, 
        borderRadius: 1.5, 
        bgcolor: alpha(ACCENT_COLOR, 0.1), 
        color: ACCENT_COLOR,
        display: 'flex'
      }}>
        {icon}
      </Box>
      <Box flexGrow={1}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        {isEditing && editComponent ? (
          <Box mt={1.5}>{editComponent}</Box>
        ) : (
          <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500, color: 'text.primary' }}>
            {value || <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>Не указано</Box>}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const getRoleName = (role) => {
  switch(role) {
    case 4: return 'Создатель';
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
  const ACCENT_COLOR = theme.palette.primary.main; 
  
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const isMyProfile = !id || (currentUser && parseInt(id) === currentUser.id);
  const targetId = id || currentUser?.id;
  const isAdmin = currentUser?.role >= 3;
  const canEdit = isMyProfile || isAdmin;
  const canKick = isAdmin && !isMyProfile && profile?.organization_id && profile?.role !== 4;

  useEffect(() => { if (targetId) loadProfile(); }, [targetId]);

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
    } catch (e) { toast.error('Ошибка загрузки профиля'); }
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
      
      await api.put(`/users/${profile.id}`, dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success('Профиль обновлен');
      setIsEditing(false);
      loadProfile();
      if (isMyProfile) checkUser();
    } catch (e) { toast.error('Ошибка сохранения'); }
  };

  const handleLeaveOrg = async () => {
    if (!window.confirm('Вы действительно хотите выйти из организации?')) return;
    try {
      await api.post('/profile/leave');
      toast.success('Вы покинули организацию');
      await checkUser();
      navigate('/');
    } catch (e) { toast.error('Ошибка при выходе'); }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt('Напишите "DELETE" для удаления:');
    if (confirmText !== 'DELETE') return;
    try {
      await api.delete('/profile');
      logout();
      navigate('/login');
    } catch (e) { toast.error('Ошибка при удалении'); }
  };

  const handleKickUser = async () => {
    if (!window.confirm(`Исключить ${profile.full_name}?`)) return;
    try {
      await api.post(`/users/${profile.id}/kick`);
      toast.success('Пользователь исключен');
      loadProfile(); 
    } catch (e) { toast.error('Ошибка'); }
  };

  if (!profile) return <Container sx={{ py: 10, textAlign: 'center' }}><Typography color="text.secondary">Загрузка...</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Grid container spacing={4} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ 
            p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', 
            bgcolor: 'background.paper', position: 'sticky', top: 100
          }}>
            <Box mb={3} display="flex" justifyContent="center">
              <AvatarUpload 
                  currentAvatar={profile.avatar_url}
                  entityType="user" entityId={profile.id}
                  editable={canEdit} size={140}
                  onUpload={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
              />
            </Box>

            <Box textAlign="center" mb={4}>
              <Typography variant="h6" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {profile.full_name}
              </Typography>
              <Chip 
                label={getRoleName(profile.role)} 
                sx={{ bgcolor: alpha(ACCENT_COLOR, 0.1), color: ACCENT_COLOR, fontWeight: 700, borderRadius: '6px' }} 
                size="small"
              />
            </Box>
          <Stack spacing={2}>
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.03) : '#fafafa', 
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.2) : 'divider',
              transition: '0.2s',
              '&:hover': { borderColor: ACCENT_COLOR }
            }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>ОРГАНИЗАЦИЯ</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <BusinessOutlinedIcon sx={{ fontSize: 18, color: ACCENT_COLOR }} />
                {profile.organization ? (
                  <MuiLink component={Link} to={`/organizations/${profile.organization_id}`} underline="none" 
                    sx={{ fontWeight: 600, color: 'text.primary', '&:hover': { color: ACCENT_COLOR } }}>
                    {profile.organization.name}
                  </MuiLink>
                ) : <Typography variant="body2" color="text.disabled">Не состоит</Typography>}
              </Box>
            </Box>
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.03) : '#fafafa', 
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' ? alpha(ACCENT_COLOR, 0.2) : 'divider',
              transition: '0.2s',
              '&:hover': { borderColor: ACCENT_COLOR }
            }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>КОМАНДА</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <GroupsOutlinedIcon sx={{ fontSize: 18, color: ACCENT_COLOR }} />
                {profile.team ? (
                  <MuiLink component={Link} to={`/teams/${profile.team_id}`} underline="none" 
                    sx={{ fontWeight: 600, color: 'text.primary', '&:hover': { color: ACCENT_COLOR } }}>
                    {profile.team.name}
                  </MuiLink>
                ) : <Typography variant="body2" color="text.disabled">Без команды</Typography>}
              </Box>
            </Box>
          </Stack>
          </Paper>
        </Grid>

        <Grid item size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ 
            p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' 
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'flex-start' }}>
               <Box>
                   <Typography variant="h5" fontWeight="800" sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>Личные данные</Typography>
                   <Typography variant="body2" sx={{ color: 'text.secondary' }}>Информация вашего профиля</Typography>
               </Box>
               
               {canEdit && (
                 <Box>
                   {!isEditing ? (
                       <Button 
                         startIcon={<EditOutlinedIcon />} onClick={() => setIsEditing(true)}
                         variant="outlined"
                         sx={{ borderRadius: '8px', textTransform: 'none', color: 'text.primary', borderColor: 'divider', fontWeight: 600 }}
                       >
                         Редактировать
                       </Button>
                   ) : (
                     <Stack direction="row" spacing={1}>
                       <Button onClick={() => setIsEditing(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Отмена</Button>
                       <Button 
                         variant="contained" onClick={handleSave} disableElevation
                         sx={{ bgcolor: ACCENT_COLOR, borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: ACCENT_COLOR } }}
                       >
                         Сохранить
                       </Button>
                     </Stack>
                   )}
                 </Box>
               )}
            </Box>

            <Box>
              <InfoRow 
                icon={<BadgeOutlinedIcon />} label="Полное имя" value={profile.full_name} isEditing={isEditing}
                editComponent={<TextField fullWidth size="small" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />}
              />
              <InfoRow icon={<EmailOutlinedIcon />} label="Email адрес" value={profile.email} isEditing={false} />
              <InfoRow 
                icon={<PhoneOutlinedIcon />} label="Телефон" value={profile.phone} isEditing={isEditing}
                editComponent={<TextField fullWidth size="small" placeholder="+7..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />}
              />
              <InfoRow 
                icon={<InfoOutlinedIcon />} label="Биография" value={profile.bio} isEditing={isEditing}
                editComponent={<TextField fullWidth multiline rows={3} size="small" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />}
              />

              {isEditing && isAdmin && (
                 <Box sx={{ p: 3, border: '1px dashed', borderColor: ACCENT_COLOR, borderRadius: 2, mt: 3, bgcolor: alpha(ACCENT_COLOR, 0.02) }}>
                     <Typography variant="caption" sx={{ color: ACCENT_COLOR, fontWeight: 700, display: 'block', mb: 2 }}>СИСТЕМНЫЕ ПАРАМЕТРЫ (ADMIN ONLY)</Typography>
                     <Stack direction="row" spacing={2}>
                        <TextField 
                            label="ID Команды" type="number" size="small" value={formData.team_id}
                            onChange={e => setFormData({...formData, team_id: parseInt(e.target.value) || 0})}
                        />
                        <TextField 
                            label="Role ID" type="number" size="small" value={formData.role}
                            onChange={e => setFormData({...formData, role: parseInt(e.target.value)})}
                        />
                     </Stack>
                 </Box>
              )}
            </Box>

            {(isMyProfile || canKick) && !isEditing && (
              <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.1em' }}>УПРАВЛЕНИЕ АККАУНТОМ</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
                  {isMyProfile && profile.organization_id && profile.role !== 4 && (
                    <Button 
                      variant="outlined" sx={{ borderColor: 'divider', color: 'text.secondary', textTransform: 'none', borderRadius: '8px' }}
                      startIcon={<LogoutOutlinedIcon />} onClick={handleLeaveOrg}
                    >
                      Покинуть организацию
                    </Button>
                  )}
                  {canKick && (
                    <Button 
                      variant="outlined" sx={{ borderColor: 'divider', color: 'text.secondary', textTransform: 'none', borderRadius: '8px' }}
                      startIcon={<PersonRemoveOutlinedIcon />} onClick={handleKickUser}
                    >
                      Исключить из организации
                    </Button>
                  )}
                  {isMyProfile && profile.role !== 4 && (
                    <Button 
                      variant="text" sx={{ color: 'text.disabled', textTransform: 'none', fontSize: '0.8rem' }}
                      startIcon={<DeleteOutlineIcon />} onClick={handleDeleteAccount}
                    >
                      Удалить аккаунт
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Container>
  );
}