import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AvatarUpload from '../components/AvatarUpload';
import { 
  Box, Typography, Paper, TextField, Button, List, 
  ListItem, ListItemText, Grid, Link as MuiLink, 
  Container, Avatar, Chip, Stack, IconButton, Tooltip, Divider, useTheme, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  ListItemSecondaryAction
} from '@mui/material';
import { toast } from 'react-hot-toast';

import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';

const API_BASE_URL = 'http://localhost:8080'; 

const getImageUrl = (path) => {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default function TeamProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  
  const ACCENT_COLOR = theme.palette.primary.main;

  const [team, setTeam] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [freeUsers, setFreeUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [potentialLeaders, setPotentialLeaders] = useState([]);
  const [newLeaderId, setNewLeaderId] = useState('');

  useEffect(() => { loadTeam(); }, [id]);

  const loadTeam = async () => {
    try {
      const { data } = await api.get(`/teams/${id}`);
      setTeam(data);
      setFormData({ name: data.name, description: data.description });
    } catch (e) { toast.error('Команда не найдена'); }
  };
  
  const handleSave = async () => {
    try {
      await api.put(`/teams/${id}`, { name: formData.name, description: formData.description });
      toast.success('Обновлено');
      setIsEditing(false);
      loadTeam();
    } catch (e) { toast.error('Доступ запрещен'); }
  };

  const handleOpenLeaderModal = async () => {
    try {
        const { data } = await api.get(`/potential-leaders?team_id=${id}`);
        setPotentialLeaders(data);
        setNewLeaderId(team.leader_id || '');
        setIsLeaderModalOpen(true);
    } catch(e) { toast.error("Ошибка загрузки списка руководителей"); }
  };

  const handleSaveLeader = async () => {
    try {
        const payload = { leader_id: newLeaderId ? parseInt(newLeaderId) : null };
        await api.put(`/teams/${id}/leader`, payload);
        toast.success("Руководитель изменен");
        setIsLeaderModalOpen(false);
        loadTeam();
    } catch(e) { toast.error("Ошибка обновления руководителя"); }
  };

  const handleDeleteTeam = async () => {
    const confirmText = prompt(`Для подтверждения удаления введите название команды: "${team.name}"`);
    if (confirmText !== team.name) return;
    try {
        await api.delete(`/teams/${id}`);
        toast.success("Команда удалена");
        navigate(`/organizations/${team.organization_id}`);
    } catch(e) { toast.error("Ошибка при удалении команды"); }
  };

  const handleOpenAddModal = async () => {
    if (!team?.organization_id) return;
    try {
      const { data } = await api.get(`/organizations/${team.organization_id}/free-users`);
      setFreeUsers(data);
      setIsAddModalOpen(true);
    } catch (e) { toast.error('Ошибка загрузки свободных сотрудников'); }
  };

  const handleAddMember = async () => {
    try {
      await api.post(`/teams/${id}/members`, { user_id: selectedUserId });
      toast.success('Сотрудник добавлен');
      setIsAddModalOpen(false);
      setSelectedUserId('');
      loadTeam();
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка добавления'); }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Удалить ${memberName} из команды?`)) return;
    try {
      await api.delete(`/teams/${id}/members/${memberId}`);
      toast.success('Удален из команды');
      loadTeam();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  if (!team) return <Container sx={{py: 10, textAlign: 'center'}}><Typography color="text.secondary">Загрузка...</Typography></Container>;

  const isLeader = team.leader_id === user?.id;
  const isAdmin = user?.role >= 3;
  const canEdit = isLeader || isAdmin;

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: '12px', mb: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item size={{ xs: 12, md: 'auto' }} sx={{ display: 'flex', justifyContent: 'center' }}>
            <AvatarUpload 
              currentAvatar={team.avatar_url} 
              entityType="team" 
              entityId={team.id} 
              editable={canEdit} 
              size={140} 
              onUpload={(url) => setTeam({ ...team, avatar_url: url })} 
            />
          </Grid>
          <Grid item size={{ xs: 12, md: true }}>
             <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box width="100%">
                {isEditing ? (
                  <Stack spacing={2} mb={2} sx={{ maxWidth: 500 }}>
                    <TextField fullWidth size="small" label="Название" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <TextField fullWidth multiline rows={3} size="small" label="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h4" fontWeight="800" sx={{ mb: 2, letterSpacing: '-0.03em', color: 'text.primary' }}>{team.name}</Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                        {team.organization && (
                          <Chip 
                            icon={<BusinessOutlinedIcon style={{ fontSize: 16 }} />} 
                            label={team.organization.name} 
                            component={Link} to={`/organizations/${team.organization_id}`} 
                            clickable variant="outlined" 
                            sx={{ borderRadius: '6px', fontWeight: 600, '&:hover': { borderColor: ACCENT_COLOR, color: ACCENT_COLOR } }} 
                          />
                        )}
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            avatar={<Avatar src={getImageUrl(team.leader?.avatar_url)} />} 
                            label={team.leader ? `Лидер: ${team.leader.full_name}` : "Без лидера"} 
                            component={team.leader ? Link : 'div'} 
                            to={team.leader ? `/users/${team.leader_id}` : undefined}
                            clickable={!!team.leader} variant="outlined" 
                            sx={{ borderRadius: '6px', fontWeight: 600, bgcolor: alpha(ACCENT_COLOR, 0.05), borderColor: alpha(ACCENT_COLOR, 0.2) }} 
                          />
                          {isAdmin && (
                            <Tooltip title="Сменить руководителя">
                              <IconButton size="small" onClick={handleOpenLeaderModal} sx={{ border: '1px solid', borderColor: 'divider' }}>
                                <EditOutlinedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                    </Stack>
                    <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{team.description || "Описание отсутствует."}</Typography>
                  </>
                )}
              </Box>
              {canEdit && (
                <Box ml={2}>
                    {!isEditing ? (
                      <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setIsEditing(true)} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: 'divider' }}>
                        Изменить
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <IconButton onClick={() => setIsEditing(false)}><CloseOutlinedIcon /></IconButton>
                        <IconButton onClick={handleSave} sx={{ color: ACCENT_COLOR }}><SaveOutlinedIcon /></IconButton>
                      </Stack>
                    )}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      <Paper elevation={0} sx={{ p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
                <GroupsOutlinedIcon sx={{ color: ACCENT_COLOR, fontSize: 28 }} />
                <Typography variant="h5" fontWeight="800">Участники <Box component="span" sx={{ color: 'text.disabled', ml: 1, fontWeight: 400 }}>{team.members?.length || 0}</Box></Typography>
            </Box>
            {canEdit && (
                <Button variant="contained" disableElevation startIcon={<PersonAddOutlinedIcon />} onClick={handleOpenAddModal} sx={{ borderRadius: '8px', bgcolor: ACCENT_COLOR, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: ACCENT_COLOR } }}>
                    Добавить
                </Button>
            )}
        </Box>
        <Divider sx={{ mb: 1 }} />
        <List disablePadding>
            {team.members?.map(member => (
                <ListItem 
                    key={member.id} 
                    sx={{ py: 2, px: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
                >
                    <Box component={Link} to={`/users/${member.id}`} sx={{ display: 'flex', alignItems: 'center', width: '100%', textDecoration: 'none', color: 'inherit' }}>
                        <Avatar src={getImageUrl(member.avatar_url)} sx={{ width: 44, height: 44, mr: 2.5, border: '1px solid', borderColor: 'divider' }}>{member.full_name[0]}</Avatar>
                        <ListItemText 
                            primary={<Box display="flex" alignItems="center" gap={1}><Typography variant="body1" fontWeight="600">{member.full_name}</Typography>{member.id === team.leader_id && <VerifiedUserOutlinedIcon sx={{ color: ACCENT_COLOR, fontSize: 16 }} />}</Box>}
                            secondary={<Typography variant="caption" color="text.secondary">{member.email}</Typography>} 
                        />
                    </Box>
                    {canEdit && member.id !== team.leader_id && (
                        <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleRemoveMember(member.id, member.full_name)}>
                                <DeleteOutlineIcon sx={{ color: 'text.disabled', fontSize: 20, '&:hover': { color: '#f44336' } }} />
                            </IconButton>
                        </ListItemSecondaryAction>
                    )}
                </ListItem>
            ))}
        </List>
      </Paper>
      {isAdmin && !isEditing && (
        <Box mt={6} pt={4} borderTop="1px solid" borderColor="divider">
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.1em' }}>УПРАВЛЕНИЕ КОМАНДОЙ</Typography>
            <Box mt={2}>
                <Button 
                    variant="outlined" color="inherit" 
                    sx={{ borderColor: 'divider', textTransform: 'none', borderRadius: '8px', color: 'text.secondary' }} 
                    startIcon={<DeleteOutlineIcon />} 
                    onClick={handleDeleteTeam}
                >
                    Удалить команду
                </Button>
            </Box>
        </Box>
      )}
      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Добавить участника</DialogTitle>
        <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Выберите сотрудника, не состоящего в других командах.
            </Typography>
            {freeUsers.length > 0 ? (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel>Сотрудник</InputLabel>
                    <Select value={selectedUserId} label="Сотрудник" onChange={(e) => setSelectedUserId(e.target.value)}>
                        {freeUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <Avatar src={getImageUrl(u.avatar_url)} sx={{ width: 24, height: 24, fontSize: 10 }}>{u.full_name[0]}</Avatar>
                                    <Typography variant="body2">{u.full_name}</Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ) : <Typography variant="body2" color="text.disabled">Нет свободных сотрудников в организации</Typography>}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setIsAddModalOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Отмена</Button>
            <Button onClick={handleAddMember} variant="contained" disableElevation disabled={!selectedUserId} sx={{ bgcolor: ACCENT_COLOR, textTransform: 'none', borderRadius: '8px' }}>Добавить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isLeaderModalOpen} onClose={() => setIsLeaderModalOpen(false)} PaperProps={{ sx: { borderRadius: '12px' } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Назначить руководителя</DialogTitle>
          <DialogContent sx={{ minWidth: 320, pt: 1 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Новый лидер</InputLabel>
                  <Select value={newLeaderId} label="Новый лидер" onChange={(e) => setNewLeaderId(e.target.value)}>
                      <MenuItem value=""><Typography variant="body2" color="text.secondary">-- Без руководителя --</Typography></MenuItem>
                      {potentialLeaders.map(u => (
                        <MenuItem key={u.id} value={u.id}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar src={getImageUrl(u.avatar_url)} sx={{ width: 24, height: 24, fontSize: 10 }}>{u.full_name[0]}</Avatar>
                            <Typography variant="body2">{u.full_name}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
              </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setIsLeaderModalOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Отмена</Button>
              <Button onClick={handleSaveLeader} variant="contained" disableElevation sx={{ bgcolor: ACCENT_COLOR, textTransform: 'none', borderRadius: '8px' }}>Сохранить</Button>
          </DialogActions>
      </Dialog>
      
    </Container>
  );
}