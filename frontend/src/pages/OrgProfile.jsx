import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AvatarUpload from '../components/AvatarUpload';
import { 
  Box, Typography, Paper, TextField, Button, 
  List, ListItem, ListItemText, Divider, Avatar,
  Grid, Chip, IconButton, Container, useTheme, alpha, Stack, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  Menu, ListItemIcon, ListItemSecondaryAction
} from '@mui/material';
import { toast } from 'react-hot-toast';

// Outlined Icons
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';

const API_BASE_URL = 'http://localhost:8080'; 

const getImageUrl = (path) => {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
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
  const navigate = useNavigate();
  
  const ACCENT_COLOR = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  const [organization, setOrganization] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [inviteForm, setInviteForm] = useState({ expires_in_hours: 24, max_uses: 10 });
  const [teamForm, setTeamForm] = useState({ name: '', description: '', leader_id: null });
  const [potentialLeaders, setPotentialLeaders] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => { loadOrganization(); }, [id]);

  const loadOrganization = async () => {
    try {
      const { data } = await api.get(`/organizations/${id}`);
      setOrganization(data);
      setFormData({ name: data.name, description: data.description, avatar_url: data.avatar_url || '' });
    } catch (e) { toast.error('Организация не найдена'); }
  };

  const loadInvites = async () => {
    try {
      const { data } = await api.get('/invites');
      setInvites(data);
    } catch (e) { toast.error("Ошибка загрузки приглашений"); }
  };

  const handleOpenInviteModal = () => setInviteModalOpen(true);

  const handleCreateInvite = async () => {
    try {
      await api.post('/invites', inviteForm);
      toast.success("Ссылка создана");
      setInviteModalOpen(false);
      loadInvites();
    } catch(e) { toast.error("Ошибка создания"); }
  };

  const handleDeleteInvite = async (token) => {
    if (!window.confirm("Удалить эту ссылку?")) return;
    try {
      await api.delete(`/invites/${token}`);
      toast.success("Ссылка удалена");
      loadInvites();
    } catch(e) { toast.error("Ошибка удаления"); }
  };

  const handleOpenTeamModal = async () => {
    try {
      const { data } = await api.get(`/potential-leaders?organization_id=${organization.id}`);
      setPotentialLeaders(data);
      setTeamModalOpen(true);
    } catch(e) { toast.error("Ошибка загрузки кандидатов"); }
  };

  const handleCreateTeam = async () => {
    if (organization.teams?.some(t => t.name.toLowerCase() === teamForm.name.trim().toLowerCase())) {
      return toast.error('Имя команды уже занято');
    }
    try {
      await api.post('/teams', teamForm);
      toast.success("Команда создана");
      setTeamModalOpen(false);
      setTeamForm({ name: '', description: '', leader_id: null });
      loadOrganization(); 
    } catch(e) { toast.error("Ошибка создания"); }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Удалить команду "${teamName}"?`)) return;
    try {
        await api.delete(`/teams/${teamId}`);
        toast.success("Команда удалена");
        loadOrganization();
    } catch(e) { toast.error("Ошибка удаления"); }
  };

  const handleSave = async () => {
    try {
      await api.put(`/organizations/${id}`, { name: formData.name, description: formData.description });
      toast.success('Обновлено');
      setIsEditing(false);
      loadOrganization();
    } catch (e) { toast.error('Доступ запрещен'); }
  };

  const handleOpenRoleMenu = (event, userToEdit) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setSelectedUserForRole(userToEdit);
  };

  const handleChangeRole = async (newRole) => {
    setAnchorEl(null);
    try {
      await api.put(`/users/${selectedUserForRole.id}/role`, { role: newRole });
      toast.success("Роль обновлена");
      loadOrganization();
    } catch (e) { toast.error("Ошибка"); }
  };

  const isOwner = organization?.owner_id === user?.id;
  const isAdmin = user?.role >= 3;
  const canEdit = organization && user && (isOwner || isAdmin);

  useEffect(() => { if (canEdit) loadInvites(); }, [canEdit]);

  const scrollContainerStyles = {
    maxHeight: '400px',
    overflowY: 'auto',
    pr: 1,
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': { 
      background: theme.palette.divider, 
      borderRadius: '10px',
      '&:hover': { background: ACCENT_COLOR }
    },
  };

  if (!organization) return <Box sx={{ py: 10, textAlign: 'center' }}><Typography color="text.secondary">Загрузка...</Typography></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      
      {/* 1. HEADER */}
      <Paper elevation={0} sx={{ p: 4, borderRadius: '12px', mb: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid size={{ xs: 12, md: 'auto' }}>
             <AvatarUpload
                currentAvatar={organization.avatar_url}
                entityType="organization"
                entityId={organization.id}
                editable={canEdit}
                size={120}
                onUpload={(url) => setOrganization({ ...organization, avatar_url: url })}
             />
          </Grid>
          <Grid size={{ xs: 12, md: true }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box width="100%">
                {isEditing ? (
                  <Stack spacing={2} sx={{ maxWidth: 500 }}>
                     <TextField fullWidth size="small" label="Название" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                     <TextField fullWidth multiline rows={2} size="small" label="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.03em', mb: 1 }}>{organization.name}</Typography>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                       <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>СОЗДАНА: {new Date(organization.created_at).toLocaleDateString()}</Typography>
                       {isOwner && <Chip label="Вы владелец" size="small" sx={{ borderRadius: '6px', bgcolor: alpha(ACCENT_COLOR, 0.1), color: ACCENT_COLOR, fontWeight: 700 }} />}
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{organization.description || "Описание отсутствует."}</Typography>
                  </>
                )}
              </Box>
              {canEdit && (
                <Box ml={2}>
                  {!isEditing ? (
                      <IconButton onClick={() => setIsEditing(true)} sx={{ border: '1px solid', borderColor: 'divider' }}><EditOutlinedIcon fontSize="small" /></IconButton>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => setIsEditing(false)} sx={{ color: 'text.disabled' }}><CloseOutlinedIcon /></IconButton>
                      <IconButton onClick={handleSave} sx={{ color: ACCENT_COLOR }}><SaveOutlinedIcon /></IconButton>
                    </Stack>
                  )}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. ADMIN PANEL */}
      {canEdit && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} /> ПАНЕЛЬ УПРАВЛЕНИЯ
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="800" gutterBottom>Новое приглашение</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Создайте ссылку для новых сотрудников.</Typography>
                <Button 
                  fullWidth variant="contained" disableElevation 
                  startIcon={<LinkOutlinedIcon />} onClick={handleOpenInviteModal}
                  sx={{ bgcolor: ACCENT_COLOR, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  Создать ссылку
                </Button>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper elevation={0} sx={{ p: 3, height: '100%', borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeOutlinedIcon sx={{ fontSize: 18 }} /> Активные ссылки
                </Typography>
                {invites.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                    {invites.map((invite) => (
                      <Box key={invite.token} sx={{ 
                        p: 1.5, minWidth: 200, borderRadius: 2, 
                        bgcolor: isDark ? alpha(ACCENT_COLOR, 0.04) : '#fafafa', 
                        border: '1px solid', borderColor: isDark ? alpha(ACCENT_COLOR, 0.2) : 'divider' 
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block' }}>{invite.token.substring(0, 10)}...</Typography>
                        <Typography variant="caption" color="text.secondary">{invite.uses}/{invite.max_uses} исп.</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <IconButton size="small" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?token=${invite.token}`)}><ContentCopyOutlinedIcon fontSize="inherit" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteInvite(invite.token)}><DeleteOutlineIcon fontSize="inherit" /></IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                ) : <Typography variant="body2" color="text.disabled" sx={{ py: 2 }}>Нет приглашений</Typography>}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* 3. LISTS WITH SCROLL */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <GroupsOutlinedIcon sx={{ color: ACCENT_COLOR }} />
                <Typography variant="h6" fontWeight="800">Команды</Typography>
              </Box>
              {canEdit && (
                <Button size="small" startIcon={<GroupAddOutlinedIcon />} onClick={handleOpenTeamModal} sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 600 }}>Создать</Button>
              )}
            </Box>
            <Box sx={scrollContainerStyles}>
              <List disablePadding>
                {organization.teams?.map(t => (
                  <ListItem key={t.id} sx={{ mb: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: alpha(ACCENT_COLOR, 0.04) } }}>
                    <Box component={Link} to={`/teams/${t.id}`} sx={{ display: 'flex', alignItems: 'center', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                      <Avatar src={getImageUrl(t.avatar_url)} sx={{ mr: 2, borderRadius: '8px', bgcolor: alpha(ACCENT_COLOR, 0.1), color: ACCENT_COLOR }}>{t.name[0]}</Avatar>
                      <ListItemText primary={<Typography variant="subtitle2" fontWeight="700">{t.name}</Typography>} secondary={t.description} />
                    </Box>
                    {canEdit && (
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => handleDeleteTeam(t.id, t.name)}><DeleteOutlineIcon sx={{ fontSize: 20 }} /></IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PeopleOutlinedIcon sx={{ color: ACCENT_COLOR }} />
              <Typography variant="h6" fontWeight="800">Сотрудники</Typography>
            </Box>
            <Box sx={scrollContainerStyles}>
              <List disablePadding>
                {organization.users?.map(m => {
                  const cfg = getRoleConfig(m.role);
                  return (
                    <ListItem key={m.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box component={Link} to={`/users/${m.id}`} sx={{ display: 'flex', alignItems: 'center', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                        <Avatar src={getImageUrl(m.avatar_url)} sx={{ mr: 2 }}>{m.full_name[0]}</Avatar>
                        <ListItemText primary={<Typography variant="subtitle2" fontWeight="600">{m.full_name}</Typography>} secondary={m.email} />
                      </Box>
                      <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={cfg.label} size="small" variant="outlined" sx={{ borderRadius: '4px', fontWeight: 700 }} />
                        {isOwner && m.id !== user.id && m.role !== 4 && (
                          <IconButton size="small" onClick={(e) => handleOpenRoleMenu(e, m)}><MoreVertOutlinedIcon fontSize="small" /></IconButton>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* MODALS */}
      <Dialog open={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Создать приглашение</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Срок (часов)" type="number" fullWidth size="small" value={inviteForm.expires_in_hours} onChange={e => setInviteForm({...inviteForm, expires_in_hours: parseInt(e.target.value)})} />
            <TextField label="Макс. использований" type="number" fullWidth size="small" value={inviteForm.max_uses} onChange={e => setInviteForm({...inviteForm, max_uses: parseInt(e.target.value)})} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setInviteModalOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateInvite} variant="contained" disableElevation sx={{ bgcolor: ACCENT_COLOR }}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isTeamModalOpen} onClose={() => setTeamModalOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Новая команда</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Название" fullWidth size="small" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
            <TextField label="Описание" multiline rows={2} fullWidth size="small" value={teamForm.description} onChange={e => setTeamForm({...teamForm, description: e.target.value})} />
            <FormControl fullWidth size="small">
              <InputLabel>Руководитель</InputLabel>
              <Select label="Руководитель" value={teamForm.leader_id || ""} onChange={e => setTeamForm({...teamForm, leader_id: e.target.value || null})}>
                <MenuItem value=""><em>Без руководителя</em></MenuItem>
                {potentialLeaders.map(l => <MenuItem key={l.id} value={l.id}>{l.full_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setTeamModalOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateTeam} variant="contained" disableElevation sx={{ bgcolor: ACCENT_COLOR }}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleChangeRole(3)}><AdminPanelSettingsOutlinedIcon sx={{ mr: 1 }} /> Администратор</MenuItem>
        <MenuItem onClick={() => handleChangeRole(1)}><PersonOutlineIcon sx={{ mr: 1 }} /> Сотрудник</MenuItem>
      </Menu>

    </Container>
  );
}