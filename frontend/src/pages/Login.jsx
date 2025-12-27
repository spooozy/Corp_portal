import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  Container, Box, TextField, Button, Typography, Paper, 
  Avatar, Link, Grid, InputAdornment, Divider, useTheme, alpha 
} from '@mui/material';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined';
import GoogleIcon from '../components/GoogleIcon';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const ACCENT_COLOR = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      const success = await googleAuth(tokenResponse.access_token);
      if (success) navigate('/');
      setLoading(false);
    },
    onError: () => setLoading(false),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) navigate('/');
    setLoading(false);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      bgcolor: 'background.default',
      transition: 'background 0.3s ease'
    }}>
      <Container component="main" maxWidth="xs">
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 4, sm: 5 }, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          }}
        >
          <Box 
            sx={{ 
              mb: 2, 
              p: 1.5, 
              borderRadius: '12px', 
              bgcolor: alpha(ACCENT_COLOR, 0.1), 
              color: ACCENT_COLOR,
              display: 'flex'
            }}
          >
            <LockOutlinedIcon fontSize="large" />
          </Box>
          
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800, 
              letterSpacing: '-0.03em', 
              mb: 1,
              color: 'text.primary' 
            }}
          >
            Вход в систему
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            Добро пожаловать в Croco
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal" required fullWidth 
              label="Электронная почта" 
              autoComplete="email" 
              autoFocus
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutlineIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '10px' }
              }}
              sx={{ mb: 1 }}
            />
            <TextField
              margin="normal" required fullWidth 
              label="Пароль" 
              type="password" 
              autoComplete="current-password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HttpsOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '10px' }
              }}
            />
            
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              disableElevation
              disabled={loading}
              sx={{ 
                mt: 4, mb: 2, py: 1.5, 
                borderRadius: '10px', 
                fontWeight: 700, 
                textTransform: 'none',
                fontSize: '0.95rem',
                bgcolor: ACCENT_COLOR,
                '&:hover': { bgcolor: alpha(ACCENT_COLOR, 0.8) }
              }}
            >
              {loading ? 'Загрузка...' : 'Войти'}
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>ИЛИ</Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              sx={{ 
                mb: 4, py: 1.2, 
                borderRadius: '10px', 
                borderColor: 'divider', 
                color: 'text.primary', 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: '0.9rem',
                '&:hover': { borderColor: 'text.secondary', bgcolor: alpha(theme.palette.text.primary, 0.02) }
              }}
            >
              Продолжить через Google
            </Button>
            
            <Grid container justifyContent="center">
              <Link 
                component={RouterLink} 
                to="/register" 
                variant="body2" 
                underline="none"
                sx={{ 
                  color: 'text.secondary', 
                  transition: 'color 0.2s',
                  '&:hover': { color: ACCENT_COLOR } 
                }}
              >
                Нет аккаунта? <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>Зарегистрироваться</Box>
              </Link>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}