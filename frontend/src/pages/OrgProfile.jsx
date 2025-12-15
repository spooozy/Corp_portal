import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AvatarUpload from '../components/AvatarUpload';
import { 
  Box, Typography, Paper, TextField, Button, 
  List, ListItem, ListItemText, Divider, Avatar,
  Grid, Chip, IconButton, Container, useTheme, alpha, Stack, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, CardActionArea, Menu, ListItemIcon
} from '@mui/material';
import { toast } from 'react-hot-toast';

import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete'
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LinkIcon from '@mui/icons-material/Link';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';

const API_BASE_URL = 'http://localhost:8080'; 

const getImageUrl = (path) => {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path}`;
}

const getRoleConfig = (role) => {
  switch(role) {
    case 4: return { label: 'Владелец', color: 'error' };
    case 3: return { label: 'Админ', color: 'secondary' };
    case 2: return { label: 'Руководитель', color: 'primary' };
    default: return { label: 'Сотрудник', color: 'default' };
  }
};

export default function OrgProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [organization, setOrganization] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [inviteForm, setInviteForm] = useState({ expires_in_hours: 24, max_uses: 10 });
  const [teamForm, setTeamForm] = useState({ name: '', description: '', leader_id: '' });
  const [potentialLeaders, setPotentialLeaders] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    loadOrganization();
  }, [id]);

  const loadOrganization = async () => {
    try {
      const { data } = await api.get(`/organizations/${id}`);
      setOrganization(data);
      setFormData({ 
        name: data.name, 
        description: data.description,
        avatar_url: data.avatar_url || ''
      });
    } catch (e) {
      toast.error('Организация не найдена или нет доступа');
    }
  };

  const loadInvites = async () => {
    try {
      const { data } = await api.get('/invites');
      setInvites(data);
      console.log(data);
    } catch (e) { 
      toast.error("Ошибка загрузки приглашений"); 
    }
  };

  const handleOpenInviteModal = () => {
    setInviteModalOpen(true);
  };

  const handleCreateInvite = async () => {
    try {
      await api.post('/invites', inviteForm);
      toast.success("Ссылка создана!");
      setInviteModalOpen(false);
      loadInvites();
    } catch(e) { 
      toast.error("Ошибка создания ссылки"); 
    }
  };

  const handleDeleteInvite = async (token) => {
    if (!window.confirm("Удалить эту ссылку?")) return;
    try {
      await api.delete(`/invites/${token}`);
      toast.success("Ссылка удалена");
      loadInvites();
    } catch(e) { 
      toast.error("Ошибка удаления"); 
    }
  };

  const handleOpenTeamModal = async () => {
    try {
      const { data } = await api.get(`/potential-leaders?organization_id=${organization.id}`);
      setPotentialLeaders(data);
      setTeamModalOpen(true);
    } catch(e) { 
      toast.error("Не удалось загрузить кандидатов"); 
    }
  };

  const handleCreateTeam = async () => {
    try {
      await api.post('/teams', teamForm);
      toast.success(`Команда "${teamForm.name}" создана!`);
      setTeamModalOpen(false);
      loadOrganization(); 
    } catch(e) { 
      toast.error(e.response?.data?.error || "Ошибка создания команды"); 
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить команду "${teamName}"? Все участники будут исключены из неё.`)) return;
    try {
        await api.delete(`/teams/${teamId}`);
        toast.success("Команда удалена");
        loadOrganization();
    } catch(e) { toast.error("Ошибка удаления"); }
  };

  const handleSave = async () => {
    try {
      await api.put(`/organizations/${id}`, {
        name: formData.name,
        description: formData.description
      });
      toast.success('Организация обновлена');
      setIsEditing(false);
      loadOrganization();
    } catch (e) {
      toast.error('Нет прав для редактирования');
    }
  };

  const handleOpenRoleMenu = (event, userToEdit) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedUserForRole(userToEdit);
  };

  const handleCloseRoleMenu = () => {
    setAnchorEl(null);
    setSelectedUserForRole(null);
  };

  const handleChangeRole = async (newRole) => {
    handleCloseRoleMenu();
    if (!selectedUserForRole) return;

    try {
      await api.put(`/users/${selectedUserForRole.id}/role`, { role: newRole });
      toast.success("Роль пользователя обновлена");
      loadOrganization();
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка обновления роли");
    }
  };

  const isOwner = organization?.owner_id === user?.id;
  const isAdmin = user?.role >= 3;
  const canEdit = organization && user && (isOwner || isAdmin);

  useEffect(() => {
    if (canEdit) {
      loadInvites();
    }
  }, [canEdit]);

  if (!organization) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Загрузка организации...</Typography>
      </Container>
    );
  }

  const StatCard = ({ icon, count, label, color }) => (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2, 
        borderRadius: 3, 
        bgcolor: alpha(color, 0.1), 
        color: color,
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        height: '100%'
      }}
    >
      <Box 
        sx={{ 
          width: 48, 
          height: 48, 
          bgcolor: 'white', 
          borderRadius: '50%', 
          boxShadow: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="bold" lineHeight={1}>
          {count}
        </Typography>
        <Typography variant="body2" fontWeight="medium" sx={{ opacity: 0.8 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );


  const AdminActionCard = ({ icon, title, description, buttonText, onClick, color = "primary" }) => (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: `${color}.main`,
          boxShadow: `0 4px 12px ${alpha(theme.palette[color].main, 0.1)}`
        }
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: `${color}.50`,
            color: `${color}.main`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
          {description}
        </Typography>
        
        <Button 
          variant="contained" 
          startIcon={buttonText.includes('Приглашение') ? <LinkIcon /> : <GroupAddIcon />}
          onClick={onClick}
          fullWidth
          size="medium"
          sx={{ 
            bgcolor: `${color}.main`,
            '&:hover': {
              bgcolor: `${color}.dark`,
            }
          }}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );

  const scrollContainerStyles = {
    maxHeight: '400px',
    overflowY: 'auto',
    pr: 1, 
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#c1c1c1',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#a8a8a8',
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 4, 
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md="auto" display="flex" justifyContent="center">
             <AvatarUpload
                currentAvatar={organization.avatar_url}
                entityType="organization"
                entityId={organization.id}
                editable={canEdit}
                size={120}
                onUpload={(newUrl) => {
                  setOrganization({ ...organization, avatar_url: newUrl });
                  setFormData({ ...formData, avatar_url: newUrl });
                }}
             />
          </Grid>
          <Grid item xs={12} md>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box width="100%">
                {isEditing ? (
                  <Stack spacing={2} mb={2}>
                     <TextField 
                        fullWidth label="Название" variant="outlined"
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                     <TextField 
                        fullWidth multiline rows={2} label="Описание" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})}
                     />
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h4" fontWeight="800" gutterBottom>
                      {organization.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                       <Typography variant="body2" color="text.secondary">
                          Дата создания: {new Date(organization.created_at).toLocaleDateString()}
                       </Typography>
                       {isOwner && (
                         <Chip icon={<VerifiedUserIcon />} label="Вы владелец" color="primary" size="small" variant="outlined" />
                       )}
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '800px' }}>
                      {organization.description || "Описание отсутствует"}
                    </Typography>
                  </>
                )}
              </Box>
              {canEdit && (
                <Box ml={2}>
                  {!isEditing ? (
                    <Tooltip title="Редактировать">
                      <IconButton onClick={() => setIsEditing(true)} sx={{ bgcolor: 'action.hover' }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => setIsEditing(false)} color="error" sx={{ bgcolor: 'error.50' }}>
                        <CancelIcon />
                      </IconButton>
                      <IconButton onClick={handleSave} color="success" sx={{ bgcolor: 'success.50' }}>
                        <SaveIcon />
                      </IconButton>
                    </Stack>
                  )}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {canEdit && (
          <Box mt={4}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <AdminPanelSettingsIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Панель администратора</Typography>
            </Box>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <AdminActionCard
                  icon={<LinkIcon />}
                  title="Пригласить сотрудников"
                  description="Создайте ссылку-приглашение для добавления новых членов в организацию"
                  buttonText="Создать приглашение"
                  onClick={handleOpenInviteModal}
                  color="primary"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CardContent sx={{ p: 3, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: 2, 
                        bgcolor: 'warning.50',
                        color: 'warning.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AccessTimeIcon />
                      </Box>
                      <Typography variant="h6" fontWeight="bold">Активные приглашения</Typography>
                    </Box>
                    
                    {invites.length > 0 ? (
                      <List dense sx={{ maxHeight: 120, overflowY: 'auto' }}>
                        {invites.slice(0, 3).map((invite) => (
                          <ListItem 
                            key={invite.token}
                            disablePadding
                            sx={{ mb: 1 }}
                          >
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              width: '100%',
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'grey.50'
                            }}>
                              <Box>
                                <Typography variant="caption" fontWeight="medium">
                                  {invite.token.substring(0, 12)}...
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {invite.uses}/{invite.max_uses} использований
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Копировать">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?token=${invite.token}`)}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Удалить">
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleDeleteInvite(invite.token)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>
                          </ListItem>
                        ))}
                        {invites.length > 3 && (
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                            и ещё {invites.length - 3} приглашений
                          </Typography>
                        )}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        Нет активных приглашений
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <StatCard 
            icon={<GroupsIcon color="primary" />} 
            count={organization.teams?.length || 0} 
            label="Активных команд"
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard 
            icon={<PeopleIcon color="secondary" />} 
            count={organization.users?.length || 0} 
            label="Всего сотрудников"
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                   <GroupsIcon color="primary" />
                   <Typography variant="h6" fontWeight="bold">Команды</Typography>
                </Box>
                {canEdit && (
                  <Button 
                    startIcon={<AddCircleOutlineIcon />} 
                    size="small" 
                    onClick={handleOpenTeamModal}
                    variant="outlined"
                  >
                    Создать
                  </Button>
                )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={scrollContainerStyles}>
              <List disablePadding>
                {organization.teams && organization.teams.length > 0 ? (
                  organization.teams.map((team) => (
                    <ListItem 
                      key={team.id}
                      component={Link} 
                      to={`/teams/${team.id}`}
                      disableGutters
                      sx={{ 
                        p: 1.5,
                        mb: 1.5, 
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderColor: 'primary.light',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                       <Avatar 
                            src={getImageUrl(team.avatar_url)}
                            sx={{mr: 2, width: 48, height: 48 }}
                            variant="rounded"
                       >
                          {team.name[0]}
                       </Avatar>
                       <ListItemText 
                          primary={<Typography variant="subtitle1" fontWeight="bold">{team.name}</Typography>}
                          secondary={<Typography variant="body2" color="text.secondary" noWrap>{team.description || "Без описания"}</Typography>} 
                       />
                       {team.leader && (
                          <Tooltip title={`Лидер: ${team.leader.full_name}`}>
                              <Avatar             
                                src={getImageUrl(team.leader.avatar_url)} 
                                sx={{ width: 28, height: 28, ml: 1, border: '2px solid white' }} 
                              />
                          </Tooltip>
                       )}
                    </ListItem>
                  ))
                ) : (
                  <Box textAlign="center" py={4} bgcolor="#f9f9f9" borderRadius={2}>
                    <Typography variant="body2" color="text.secondary">Команд пока нет</Typography>
                  </Box>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column'
            }}
            secondaryAction={
            canEdit && (
              <IconButton 
                edge="end" 
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteTeam(team.id, team.name);
                }}
              >
                <DeleteIcon color="error" />
              </IconButton>
            )
    }
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
               <PeopleIcon color="secondary" />
               <Typography variant="h6" fontWeight="bold">Сотрудники</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={scrollContainerStyles}>
              <List disablePadding>
                {organization.users && organization.users.length > 0 ? (
                  organization.users.map((member) => {
                    const roleConfig = getRoleConfig(member.role);
                    return (
                      <ListItem 
                        key={member.id}
                        component={Link} 
                        to={`/users/${member.id}`}
                        disableGutters
                        sx={{ 
                          p: 1.5,
                          mb: 1.5, 
                          borderRadius: 2,
                          textDecoration: 'none',
                          color: 'inherit',
                          border: '1px solid transparent',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.secondary.main, 0.05),
                            border: '1px solid',
                            borderColor: 'secondary.light'
                          }
                        }}
                        secondaryAction={
                            isOwner && member.id !== user.id && member.role !== 4 && (
                              <IconButton 
                                  edge="end" 
                                  onClick={(e) => handleOpenRoleMenu(e, member)}
                                  sx={{ color: 'text.secondary' }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            )
                          }
                      >
                         <Avatar 
                          src={getImageUrl(member.avatar_url)} 
                          sx={{ mr: 2, width: 40, height: 40 }}
                         >
                          {member.full_name[0]}
                         </Avatar>
                         
                         <ListItemText 
                            primary={<Typography variant="subtitle2" fontWeight="600">{member.full_name}</Typography>}
                            secondary={member.email}
                         />
                         
                         <Chip 
                            label={roleConfig.label} 
                            size="small" 
                            color={roleConfig.color}
                            variant="outlined"
                            sx={{ height: 24, fontSize: '0.7rem', mr: isOwner ? 1 : 0 }} 
                         />
                      </ListItem>
                    );
                  })
                ) : (
                  <Box textAlign="center" py={4} bgcolor="#f9f9f9" borderRadius={2}>
                    <Typography variant="body2" color="text.secondary">Сотрудников пока нет</Typography>
                  </Box>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

      </Grid>
    
      <Dialog open={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <PersonAddIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Пригласить сотрудников</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
              <TextField 
                label="Срок действия (часов)" 
                type="number" 
                fullWidth 
                value={inviteForm.expires_in_hours} 
                onChange={e => setInviteForm({...inviteForm, expires_in_hours: parseInt(e.target.value)})}
                helperText="Через сколько часов ссылка перестанет работать"
              />
              <TextField 
                label="Максимум использований" 
                type="number" 
                fullWidth 
                value={inviteForm.max_uses} 
                onChange={e => setInviteForm({...inviteForm, max_uses: parseInt(e.target.value)})}
                helperText="Сколько человек смогут присоединиться по этой ссылке"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setInviteModalOpen(false)} variant="outlined">Отмена</Button>
              <Button onClick={handleCreateInvite} variant="contained">Создать ссылку</Button>
          </DialogActions>
      </Dialog>

      <Dialog open={isTeamModalOpen} onClose={() => setTeamModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <GroupAddIcon color="secondary" />
              <Typography variant="h6" fontWeight="bold">Создать новую команду</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
              <TextField 
                autoFocus 
                label="Название команды" 
                fullWidth 
                value={teamForm.name} 
                onChange={e => setTeamForm({...teamForm, name: e.target.value})}
              />
              <TextField 
                label="Описание" 
                multiline 
                rows={2} 
                fullWidth 
                value={teamForm.description} 
                onChange={e => setTeamForm({...teamForm, description: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>Назначить руководителя</InputLabel>
                <Select 
                  label="Назначить руководителя" 
                  value={teamForm.leader_id} 
                  onChange={e => setTeamForm({
                    ...teamForm, 
                    leader_id: e.target.value === "" ? 0 : Number(e.target.value)
                  })}
                >
                  <MenuItem value="">
                    <em>Без руководителя (пока)</em>
                  </MenuItem>
                  {potentialLeaders.map(leader => (
                    <MenuItem key={leader.id} value={leader.id}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar 
                          src={getImageUrl(leader.avatar_url)} 
                          sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}
                        >
                          {leader.full_name[0]}
                        </Avatar>
                        <Typography variant="body2">{leader.full_name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setTeamModalOpen(false)} variant="outlined">Отмена</Button>
              <Button onClick={handleCreateTeam} variant="contained">Создать команду</Button>
          </DialogActions>
      </Dialog>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleCloseRoleMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
      <MenuItem disabled>
        <Typography variant="caption">Назначить роль:</Typography>
      </MenuItem>
      
      <MenuItem onClick={() => handleChangeRole(3)}>
        <ListItemIcon><AdminPanelSettingsIcon fontSize="small" color="secondary" /></ListItemIcon>
        <ListItemText>Администратор</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => handleChangeRole(1)}>
        <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Сотрудник</ListItemText>
      </MenuItem>
    </Menu>
    </Container>
  );
}