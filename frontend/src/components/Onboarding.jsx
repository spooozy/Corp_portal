import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Button, Typography, Paper, CircularProgress, 
  Container, Avatar, Stack, useTheme, alpha, TextField, 
  Divider, Chip, InputAdornment 
} from '@mui/material';
import { toast } from 'react-hot-toast';

import BusinessIcon from '@mui/icons-material/Business';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

export default function Onboarding() {
  const { user, checkUser } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
        toast.error('Введите название организации');
        return;
    }
    setLoading(true);
    try {
      await api.post('/organizations', { name: orgName });
      toast.success('Организация создана! Добро пожаловать.');
      await checkUser();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrg = async () => {
    if (!inviteToken.trim()) {
        toast.error('Введите код приглашения');
        return;
    }
    setLoading(true);
    try {
      await api.post(`/join/${inviteToken}`);
      toast.success('Вы успешно вступили в организацию!');
      await checkUser();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Неверный код приглашения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '80vh',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: 4,
        my: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={6} 
          sx={{ 
            p: 5, 
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'white',
            bgcolor: 'background.paper', 
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box textAlign="center" mb={4}>
            <Avatar 
              sx={{ 
                width: 80, height: 80, 
                bgcolor: 'primary.main', 
                mx: 'auto', mb: 2,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`
              }}
            >
              <RocketLaunchIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" fontWeight="800" color="text.primary">
              Привет, {user.full_name.split(' ')[0]}!
            </Typography>
            <Typography variant="body1" color="text.secondary" mt={1}>
              Вы пока не состоите ни в одной организации. <br/>
              Создайте свою команду или присоединитесь к существующей.
            </Typography>
          </Box>

          <Stack spacing={4}>
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                <BusinessIcon color="primary" /> Создать новую
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField 
                  fullWidth 
                  label="Название организации" 
                  variant="outlined"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={loading}
                />
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={handleCreateOrg}
                  disabled={loading}
                  startIcon={!loading && <AddCircleOutlineIcon />}
                  sx={{ minWidth: '130px', fontWeight: 'bold' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit"/> : 'Создать'}
                </Button>
              </Stack>
            </Box>

            <Divider>
              <Chip label="ИЛИ" size="small" sx={{ color: 'text.secondary', fontWeight: 'bold' }} />
            </Divider>

            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                <GroupAddIcon color="secondary" /> Вступить по коду
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField 
                  fullWidth 
                  label="Код приглашения" 
                  placeholder="xxxxxxxx-xxxx..."
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><VpnKeyIcon color="action" fontSize="small"/></InputAdornment>
                    ),
                  }}
                />
                <Button 
                  variant="contained" 
                  color="secondary"
                  size="large"
                  onClick={handleJoinOrg}
                  disabled={loading}
                  sx={{ minWidth: '130px', fontWeight: 'bold' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit"/> : 'Вступить'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}