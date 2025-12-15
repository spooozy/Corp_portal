import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-hot-toast';

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, checkUser } = useAuth();

  useEffect(() => {
    const performJoin = async () => {
      // 1. Если нет токена — на главную
      if (!token) return navigate('/');

      // 2. Если не авторизован — на логин (с возвратом сюда)
      if (!user) {
        // Логика редиректа уже должна быть в AuthContext или Layout, 
        // но здесь можно явно перекинуть:
        // navigate('/login', { state: { from: location } });
        return; 
      }

      // 3. Если уже в организации — спрашиваем или ошибка
      if (user.organization_id) {
         if(!window.confirm("Вы уже в организации. Сменить её?")) {
             return navigate('/');
         }
      }

      // 4. Пробуем вступить автоматически
      try {
        await api.post(`/join/${token}`);
        toast.success('Вы успешно вступили в организацию!');
        await checkUser();
        navigate('/'); // На главной теперь откроется полноценный дашборд
      } catch (e) {
        toast.error(e.response?.data?.error || 'Ошибка вступления');
        navigate('/'); // На главной откроется Onboarding, где юзер сможет ввести код вручную
      }
    };

    performJoin();
  }, [token, user, navigate, checkUser]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="60vh">
      <CircularProgress size={60} />
      <Typography mt={3}>Обработка приглашения...</Typography>
    </Box>
  );
}