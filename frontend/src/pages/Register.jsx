import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  Container, Box, TextField, Button, Typography, Paper, 
  Avatar, Link, Grid, InputAdornment, Divider 
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import GoogleIcon from '../components/GoogleIcon';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [loading, setLoading] = useState(false);
  const { register, googleAuth } = useAuth();
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
    const success = await register(form);
    if (success) {
      navigate('/login');
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
            p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main', width: 56, height: 56 }}>
            <PersonAddOutlinedIcon fontSize="large" />
          </Avatar>
          
          <Typography component="h1" variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 3 }}>
            Регистрация
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal" required fullWidth label="ФИО" autoFocus
              value={form.full_name}
              onChange={(e) => setForm({...form, full_name: e.target.value})}
              InputProps={{ startAdornment: (<InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>),}}
            />
            <TextField
              margin="normal" required fullWidth label="Email адрес" type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              InputProps={{ startAdornment: (<InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>),}}
            />
            <TextField
              margin="normal" required fullWidth label="Пароль" type="password"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              InputProps={{ startAdornment: (<InputAdornment position="start"><LockIcon color="action" /></InputAdornment>),}}
            />
            
            <Button 
              type="submit" fullWidth variant="contained" color="secondary" size="large" disabled={loading}
              sx={{ mt: 4, mb: 2, py: 1.5, borderRadius: 2, fontWeight: 'bold', fontSize: '1rem' }}
            >
              {loading ? 'Создание...' : 'Создать аккаунт'}
            </Button>
            <Divider sx={{ my: 2 }}>ИЛИ</Divider>
            <Button
              fullWidth variant="outlined" size="large"
              startIcon={<GoogleIcon />}
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              sx={{ mb: 3, py: 1.2, borderRadius: 2, borderColor: '#ddd', color: '#555', textTransform: 'none', fontSize: '1rem' }}
            >
              Войти через Google
            </Button>
            
            <Grid container justifyContent="center">
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2" underline="hover">
                  Уже есть аккаунт? <Box component="span" fontWeight="bold">Войти</Box>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}