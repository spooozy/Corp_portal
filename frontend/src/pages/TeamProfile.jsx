import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AvatarUpload from '../components/AvatarUpload';
import { 
  Box, Typography, Paper, TextField, Button, List, 
  ListItem, ListItemText, Grid, Link as MuiLink, 
  Container, Avatar, Chip, Stack, IconButton, Tooltip, Divider, useTheme, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { toast } from 'react-hot-toast';

import GroupsIcon from '@mui/icons-material/Groups';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import StarIcon from '@mui/icons-material/Star';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';

const API_BASE_URL = 'http://localhost:8080'; 

const getImageUrl = (path) => {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path}`;
};

const scrollContainerStyles = {
  maxHeight: '500px', 
  overflowY: 'auto',  
  pr: 1,              
  '&::-webkit-scrollbar': { width: '6px' },
  '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '10px' },
  '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '10px' },
  '&::-webkit-scrollbar-thumb:hover': { background: '#a8a8a8' },
};

export default function TeamProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [freeUsers, setFreeUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [potentialLeaders, setPotentialLeaders] = useState([]);
  const [newLeaderId, setNewLeaderId] = useState('');

  useEffect(() => {
    loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      const { data } = await api.get(`/teams/${id}`);
      setTeam(data);
      setFormData({ 
        name: data.name, 
        description: data.description,
        avatar_url: data.avatar_url
      });
    } catch (e) {
      toast.error('Команда не найдена');
    }
  };

  const handleDeleteTeam = async () => {
      const confirmText = prompt(`Для удаления команды введите её название: "${team.name}"`);
      if (confirmText !== team.name) return;
      
      try {
          await api.delete(`/teams/${id}`);
          toast.success("Команда удалена");
          navigate(`/organizations/${team.organization_id}`);
      } catch(e) { toast.error("Ошибка удаления"); }
  };

  const handleOpenLeaderModal = async () => {
      try {
          const { data } = await api.get(`/potential-leaders?team_id=${id}`);
          setPotentialLeaders(data);
          setNewLeaderId(team.leader_id || '');
          setIsLeaderModalOpen(true);
      } catch(e) { toast.error("Ошибка загрузки списка"); }
  };

  const handleSaveLeader = async () => {
      try {
          const payload = { leader_id: newLeaderId ? parseInt(newLeaderId) : null };
          await api.put(`/teams/${id}/leader`, payload);
          toast.success("Руководитель изменен");
          setIsLeaderModalOpen(false);
          loadTeam();
      } catch(e) { toast.error("Ошибка обновления"); }
  };

  const handleSave = async () => {
    try {
      await api.put(`/teams/${id}`, {
        name: formData.name,
        description: formData.description
      });
      toast.success('Команда обновлена');
      setIsEditing(false);
      loadTeam();
    } catch (e) {
      toast.error('Нет прав для редактирования');
    }
  };

  const handleOpenAddModal = async () => {
    if (!team.organization_id) return;
    try {
      const { data } = await api.get(`/organizations/${team.organization_id}/free-users`);
      setFreeUsers(data);
      setIsAddModalOpen(true);
    } catch (e) {
      toast.error('Не удалось загрузить список сотрудников');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await api.post(`/teams/${id}/members`, { user_id: selectedUserId });
      toast.success('Сотрудник добавлен');
      setIsAddModalOpen(false);
      setSelectedUserId('');
      loadTeam();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка добавления');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Удалить ${memberName} из команды?`)) return;
    try {
      await api.delete(`/teams/${id}/members/${memberId}`);
      toast.success('Сотрудник удален из команды');
      loadTeam();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка удаления');
    }
  };

  if (!team) return <Container sx={{py: 4, textAlign: 'center'}}><Typography>Загрузка...</Typography></Container>;

  const isLeader = team.leader_id === user?.id;
  const isAdmin = user?.role >= 3;
  const canEdit = isLeader || isAdmin;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md="auto" display="flex" justifyContent="center">
            <AvatarUpload currentAvatar={team.avatar_url} entityType="team" entityId={team.id} editable={canEdit} size={140} onUpload={(newUrl) => setTeam({ ...team, avatar_url: newUrl })} />
          </Grid>
          <Grid item xs={12} md>
             <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box width="100%">
                {isEditing ? (
                  <Stack spacing={2} mb={2}>
                    <TextField fullWidth label="Название" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <TextField fullWidth multiline rows={3} label="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h4" fontWeight="800" gutterBottom>{team.name}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                        {team.organization && <Chip icon={<BusinessIcon />} label={team.organization.name} component={Link} to={`/organizations/${team.organization_id}`} clickable color="primary" variant="outlined" />}
                        <Box display="flex" alignItems="center" gap={1}>
                        {team.leader ? (
                          <Chip 
                            avatar={<Avatar src={getImageUrl(team.leader.avatar_url)} />} 
                            label={`Лидер: ${team.leader.full_name}`} 
                            component={Link} 
                            to={`/users/${team.leader_id}`} 
                            clickable 
                            variant="outlined" 
                            sx={{ borderColor: 'warning.main' }} 
                          />
                        ) : (
                          <Chip label="Без лидера" variant="outlined" />
                        )}

                        {isAdmin && (
                          <Tooltip title="Сменить руководителя">
                            <IconButton 
                              size="small" 
                              onClick={handleOpenLeaderModal} 
                              sx={{ bgcolor: 'action.hover' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                        
                    </Stack>
                    <Typography variant="body1" color="text.secondary">{team.description}</Typography>
                  </>
                )}
              </Box>
              {canEdit && (
                <Box ml={2}>
                    {!isEditing ? <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>Изменить</Button> : 
                    <Stack direction="row" spacing={1}><IconButton onClick={() => setIsEditing(false)} color="error"><CancelIcon /></IconButton><IconButton onClick={handleSave} color="success"><SaveIcon /></IconButton></Stack>}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
                <GroupsIcon color="action" fontSize="large" />
                <Typography variant="h5" fontWeight="bold">
                    Участники команды ({team.members?.length || 0})
                </Typography>
            </Box>

            {canEdit && (
                <Button 
                    variant="contained" 
                    startIcon={<PersonAddIcon />} 
                    onClick={handleOpenAddModal}
                    sx={{ borderRadius: 2 }}
                >
                    Добавить
                </Button>
            )}
        </Box>
        
        <Divider sx={{ mb: 2 }} />

        <Box sx={scrollContainerStyles}>
            <List disablePadding>
                {team.members && team.members.length > 0 ? (
                    team.members.map(member => (
                    <ListItem 
                        key={member.id} 
                        sx={{ 
                            p: 2, mb: 1, borderRadius: 2, border: '1px solid transparent', transition: 'all 0.2s',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04), borderColor: 'primary.light', boxShadow: 1 }
                        }}
                        secondaryAction={
                            canEdit && member.id !== team.leader_id && (
                                <Tooltip title="Удалить из команды">
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveMember(member.id, member.full_name)}>
                                        <DeleteIcon color="error" fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )
                        }
                    >
                        <Box component={Link} to={`/users/${member.id}`} sx={{ display: 'flex', alignItems: 'center', width: '100%', textDecoration: 'none', color: 'inherit' }}>
                            <Avatar src={getImageUrl(member.avatar_url)} sx={{ width: 50, height: 50, mr: 2, bgcolor: 'secondary.main' }}>{member.full_name[0]}</Avatar>
                            <ListItemText 
                                primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="subtitle1" fontWeight="600">{member.full_name}</Typography>
                                        {member.id === team.leader_id && <Tooltip title="Руководитель"><StarIcon color="warning" fontSize="small" /></Tooltip>}
                                    </Box>
                                } 
                                secondary={`${member.email} • ${member.id === team.leader_id ? "Руководитель" : "Сотрудник"}`} 
                            />
                        </Box>
                    </ListItem>
                    ))
                ) : (
                    <Box textAlign="center" py={5} bgcolor="#fafafa" borderRadius={2}>
                        <GroupsIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">В этой команде пока никого нет.</Typography>
                    </Box>
                )}
            </List>
        </Box>
      </Paper>

      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Добавить сотрудника</DialogTitle>
        <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
                Выберите сотрудника из организации, который еще не состоит ни в одной команде.
            </Typography>
            
            {freeUsers.length > 0 ? (
                <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="user-select-label">Сотрудник</InputLabel>
                    <Select
                        labelId="user-select-label"
                        value={selectedUserId}
                        label="Сотрудник"
                        onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                        {freeUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar src={getImageUrl(u.avatar_url)} sx={{ width: 24, height: 24 }}>{u.full_name[0]}</Avatar>
                                    {u.full_name} ({u.email})
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ) : (
                <Box textAlign="center" py={2}>
                    <Typography color="error">Нет доступных сотрудников для добавления</Typography>
                </Box>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setIsAddModalOpen(false)}>Отмена</Button>
            <Button onClick={handleAddMember} variant="contained" disabled={!selectedUserId}>Добавить</Button>
        </DialogActions>
        </Dialog>
            {isAdmin && !isEditing && (
              <Box mt={5} pt={3} borderTop="1px solid #eee">
                  <Typography variant="overline" color="error" fontWeight="bold">Управление командой</Typography>
                  <Box mt={1}>
                      <Button 
                          variant="outlined" 
                          color="error" 
                          startIcon={<DeleteForeverIcon />}
                          onClick={handleDeleteTeam}
                      >
                          Удалить команду
                      </Button>
                  </Box>
              </Box>
          )}

          <Dialog open={isLeaderModalOpen} onClose={() => setIsLeaderModalOpen(false)}>
              <DialogTitle>Управление руководителем</DialogTitle>
              <DialogContent sx={{ minWidth: 300, pt: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                      Выберите нового руководителя из списка сотрудников организации.
                  </Typography>
                  <FormControl fullWidth>
                      <InputLabel>Руководитель</InputLabel>
                      <Select
                          value={newLeaderId}
                          label="Руководитель"
                          onChange={(e) => setNewLeaderId(e.target.value)}
                      >
                          <MenuItem value="">
                              <em>-- Снять руководителя --</em>
                          </MenuItem>
                              {potentialLeaders.map(u => (
                                <MenuItem key={u.id} value={u.id}>
                                  <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar 
                                      src={getImageUrl(u.avatar_url)} 
                                      sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}
                                    >
                                      {u.full_name[0]}
                                    </Avatar>
                                    <Typography variant="body2">{u.full_name}</Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                      </Select>
                  </FormControl>
              </DialogContent>
              <DialogActions>
                  <Button onClick={() => setIsLeaderModalOpen(false)}>Отмена</Button>
                  <Button onClick={handleSaveLeader} variant="contained">Сохранить</Button>
              </DialogActions>
          </Dialog>
    </Container>
  );
}