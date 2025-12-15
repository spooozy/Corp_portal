import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardContent, CardMedia, CardActionArea,
  FormControlLabel, Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArticleIcon from '@mui/icons-material/Article';
import BusinessIcon from '@mui/icons-material/Business';

import Onboarding from '../components/Onboarding';
import CreateNewsModal from '../components/CreateNewsModal';
import FullNewsModal from '../components/FullNewsModal';

export default function Dashboard() {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCompanyOnly, setShowCompanyOnly] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchNews = async () => {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/news?search=${search}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setNews(data);
        }
      } catch (error) {
        console.error("Ошибка загрузки", error);
      } finally {
        setLoading(false);
      }
    };
    const timeoutId = setTimeout(fetchNews, 500);
    return () => clearTimeout(timeoutId);
  }, [search, user, refreshTrigger]);

  if (user && !user.organization_id) return <Onboarding />;

  const displayedNews = showCompanyOnly 
    ? news.filter(item => !item.team_id)
    : news;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h4" fontWeight="bold">Лента</Typography>
            </Box>
            {user?.role >= 2 && (
                <Button 
                    variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    Создать
                </Button>
            )}
        </Box>
        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
                placeholder="Поиск..." variant="outlined" size="small"
                value={search} onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: '200px' }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />

            <FormControlLabel
                control={
                    <Checkbox 
                        checked={showCompanyOnly}
                        onChange={(e) => setShowCompanyOnly(e.target.checked)}
                        color="primary"
                    />
                }
                label={
                    <Typography variant="body2" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BusinessIcon fontSize="small" color="action" />
                    </Typography>
                }
                sx={{ mr: 0, whiteSpace: 'nowrap' }}
            />
        </Paper>
        <Grid container spacing={2}>
            {loading ? (
                [1, 2, 3].map((n) => (
                    <Grid item xs={12} key={n}>
                        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
                    </Grid>
                ))
            ) : displayedNews.length > 0 ? (
                displayedNews.map((item) => (
                    <Grid item xs={12} key={item.id}>
                        <CompactNewsCard 
                            item={item} 
                            onClick={() => setSelectedNews(item)} 
                        />
                    </Grid>
                ))
            ) : (
                <Grid item xs={12} sx={{ textAlign: 'center', mt: 4 }}>
                    <ArticleIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                    <Typography color="text.secondary">
                        {showCompanyOnly ? "Нет новостей компании" : "Новостей нет"}
                    </Typography>
                </Grid>
            )}
        </Grid>

        <CreateNewsModal 
            open={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
            onSuccess={() => setRefreshTrigger(prev => prev + 1)} 
        />
        
        <FullNewsModal 
            news={selectedNews} 
            onClose={() => setSelectedNews(null)} 
        />

      </Container>
    </Box>
  );
}

function CompactNewsCard({ item, onClick }) {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long'
        });
    };

    return (
        <Card 
            elevation={1}
            sx={{ 
                width: '100%', 
                display: 'flex', 
                borderRadius: 3, 
                height: 160, 
                overflow: 'hidden',
                transition: '0.2s',
                '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }
            }}
        >
            <CardActionArea 
                onClick={onClick} 
                sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'stretch', height: '100%' }}
            >
                {item.image_url && (
                    <CardMedia
                        component="img"
                        sx={{ width: 180, minWidth: 180, height: '100%', objectFit: 'cover' }}
                        image={item.image_url}
                        alt={item.title}
                    />
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" noWrap>
                            {item.author?.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                            {formatDate(item.created_at)}
                        </Typography>
                    </Box>
                    <Typography 
                        variant="h6" fontWeight="bold" 
                        sx={{ lineHeight: 1.2, mb: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {item.title}
                    </Typography>
                    <Typography 
                        variant="body2" color="text.secondary"
                        sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 'auto' }}
                    >
                        {item.content}
                    </Typography>
                    {item.tags && item.tags.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, overflow: 'hidden' }}>
                            {item.tags.slice(0, 3).map((tag) => ( 
                                <Chip key={tag.id} label={`#${tag.name}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                            {item.tags.length > 3 && (
                                <Typography variant="caption" color="text.secondary">+{item.tags.length - 3}</Typography>
                            )}
                        </Box>
                    )}
                </Box>
            </CardActionArea>
        </Card>
    );
}