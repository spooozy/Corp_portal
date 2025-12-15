import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, Typography, Box, Button, TextField, Chip } from '@mui/material';
import { toast } from 'react-hot-toast';

export default function NewsFeed() {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const { data } = await api.get('/news');
      setNews(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNews = async () => {
    if (!title || !content) return;
    try {
      await api.post('/news', { title, content });
      toast.success('Новость опубликована');
      setTitle('');
      setContent('');
      loadNews();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка');
    }
  };

  const canPost = user?.role >= 3;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Новости компании</Typography>

      {canPost && (
        <Card sx={{ mb: 4, p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6">Добавить новость</Typography>
          <TextField 
            fullWidth label="Заголовок" size="small" sx={{ mb: 1, mt: 1 }}
            value={title} onChange={e => setTitle(e.target.value)}
          />
          <TextField 
            fullWidth multiline rows={2} label="Текст" size="small" sx={{ mb: 1 }}
            value={content} onChange={e => setContent(e.target.value)}
          />
          <Button variant="contained" onClick={handleCreateNews}>Опубликовать</Button>
        </Card>
      )}

      {news.map((item) => (
        <Card key={item.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary">{item.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(item.created_at).toLocaleDateString()} • Автор: {item.author?.full_name}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {item.content}
            </Typography>
          </CardContent>
        </Card>
      ))}
      
      {news.length === 0 && <Typography>Новостей пока нет.</Typography>}
    </Box>
  );
}