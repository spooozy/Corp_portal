import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  Container, Box, TextField, Button, Typography, Paper, 
  Avatar, Link, Grid, InputAdornment, Divider 
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import GoogleIcon from '../components/GoogleIcon';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      const success = await googleAuth(tokenResponse.access_token);
      if (success) {
        navigate('/');
      }
      setLoading(false);
    },
    onError: () => setLoading(false),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      background: 'linear-gradient(135deg, #ece9e6 0%, #ffffff 100%)'
    }}>
      <Container component="main" maxWidth="xs">
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
            <LockOutlinedIcon fontSize="large" />
          </Avatar>
          
          <Typography component="h1" variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 3 }}>
            Вход в систему
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal" required fullWidth 
              label="Email адрес" 
              autoComplete="email" 
              autoFocus
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
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
                  <InputAdornment position="start"><LockIcon color="action" /></InputAdornment>
                ),
              }}
            />
            
            <Button 
              type="submit" fullWidth variant="contained" size="large" disabled={loading}
              sx={{ mt: 4, mb: 2, py: 1.5, borderRadius: 2, fontWeight: 'bold', fontSize: '1rem' }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
            <Divider sx={{ my: 2 }}>ИЛИ</Divider>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              sx={{ mb: 3, py: 1.2, borderRadius: 2, borderColor: '#ddd', color: '#555', textTransform: 'none', fontSize: '1rem' }}
            >
              Войти через Google
            </Button>
            
            <Grid container justifyContent="center">
              <Grid>
                <Link component={RouterLink} to="/register" variant="body2" underline="hover">
                  Нет аккаунта? <Box component="span" fontWeight="bold">Зарегистрироваться</Box>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}