import { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Box, TextField, Button, Typography, Paper, 
  Container, Stack, Divider, useTheme, alpha 
} from '@mui/material';
import { toast } from 'react-hot-toast';

import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';

export default function Onboarding() {
  const { user, checkUser } = useAuth();
  const theme = useTheme();
  const [orgName, setOrgName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);

  const ACCENT_COLOR = theme.palette.primary.main;

  const handleCreate = async () => {
    if (!orgName.trim()) return toast.error('Введите название');
    setLoading(true);
    try {
      await api.post('/organizations', { name: orgName });
      toast.success('Организация создана!');
      await checkUser(); 
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка создания');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!inviteToken.trim()) return toast.error('Введите код');
    setLoading(true);
    try {
      await api.post(`/join/${inviteToken.trim()}`);
      toast.success('Вы успешно вступили!');
      await checkUser();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Код недействителен');
    } finally { setLoading(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '80vh' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 4, md: 6 }, 
          width: '100%',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            width: 70, height: 70, borderRadius: '20px', 
            bgcolor: alpha(ACCENT_COLOR, 0.1), color: ACCENT_COLOR,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3, border: '1px solid', borderColor: alpha(ACCENT_COLOR, 0.2)
          }}
        >
          <RocketLaunchOutlinedIcon fontSize="large" />
        </Box>

        <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.04em', mb: 1, color: 'text.primary' }}>
          Привет, {user?.full_name?.split(' ')[0]}!
        </Typography>
        
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 5, lineHeight: 1.6, px: 4 }}>
          Вы пока не состоите ни в одной организации. Создайте своё пространство или присоединитесь к существующему.
        </Typography>

        <Stack spacing={4}>
          
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: ACCENT_COLOR, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <AddBusinessOutlinedIcon sx={{ fontSize: 16 }} /> Создать новую
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                fullWidth size="small" placeholder="Название организации"
                value={orgName} onChange={(e) => setOrgName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
              <Button 
                variant="contained" disableElevation
                onClick={handleCreate} disabled={loading}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, bgcolor: ACCENT_COLOR }}
              >
                Создать
              </Button>
            </Box>
          </Box>

          <Divider>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase' }}>или</Typography>
          </Divider>

          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: ACCENT_COLOR, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <PersonAddOutlinedIcon sx={{ fontSize: 16 }} /> Вступить по коду
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                fullWidth size="small" placeholder="Код приглашения"
                value={inviteToken} onChange={(e) => setInviteToken(e.target.value)}
                InputProps={{
                  startAdornment: <KeyOutlinedIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
              <Button 
                variant="outlined"
                onClick={handleJoin} disabled={loading}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.primary' }}
              >
                Вступить
              </Button>
            </Box>
          </Box>

        </Stack>
      </Paper>
    </Container>
  );
}