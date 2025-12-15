import { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import { toast } from 'react-hot-toast';

export default function OrgCreator() {
  const [name, setName] = useState('');
  const { checkUser } = useAuth();

  const handleCreate = async () => {
    try {
      await api.post('/organizations', { name });
      toast.success('Организация создана!');
      await checkUser(); 
    } catch (e) {
      toast.error('Ошибка создания');
    }
  };

  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>Вы пока не состоите в организации</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Создайте свою или попросите приглашение у администратора.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <TextField 
          label="Название новой организации" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <Button variant="contained" onClick={handleCreate}>Создать</Button>
      </Box>
    </Paper>
  );
}