import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography, Container, useTheme, alpha } from '@mui/material';
import { toast } from 'react-hot-toast';

import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, checkUser } = useAuth();
  const theme = useTheme();
  
  const ACCENT_COLOR = theme.palette.primary.main;

  useEffect(() => {
    const performJoin = async () => {
      if (!token) return navigate('/');

      if (!user) return; 

      if (user.organization_id) {
         if(!window.confirm("Вы уже состоите в организации. Хотите сменить её на новую?")) {
             return navigate('/');
         }
      }

      try {
        await api.post(`/join/${token}`);
        toast.success('Вы успешно вступили в организацию!');
        await checkUser();
        navigate('/'); 
      } catch (e) {
        toast.error(e.response?.data?.error || 'Ошибка вступления');
        navigate('/'); 
      }
    };

    performJoin();
  }, [token, user, navigate, checkUser]);

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '70vh',
          textAlign: 'center'
        }}
      >
        <Box 
          sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '20px', 
            bgcolor: alpha(ACCENT_COLOR, 0.05), 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 4,
            border: '1px solid',
            borderColor: alpha(ACCENT_COLOR, 0.1),
            position: 'relative'
          }}
        >
          <LinkOutlinedIcon sx={{ color: ACCENT_COLOR, fontSize: 32 }} />
          
          <CircularProgress 
            size={80} 
            thickness={2}
            sx={{ 
              color: ACCENT_COLOR,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1
            }} 
          />
        </Box>

        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            mb: 1,
            color: 'text.primary'
          }}
        >
          Проверка приглашения
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary', 
            maxWidth: 280,
            lineHeight: 1.6
          }}
        >
          Мы проверяем данные ссылки и подготавливаем ваше рабочее пространство.
        </Typography>
      </Box>
    </Container>
  );
}