import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardMedia, CardActionArea,
  FormControlLabel, Checkbox, Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArticleIcon from '@mui/icons-material/Article';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

import Onboarding from '../components/Onboarding';
import CreateNewsModal from '../components/CreateNewsModal';
import FullNewsModal from '../components/FullNewsModal';

export default function Dashboard() {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [showCompanyOnly, setShowCompanyOnly] = useState(false);
  const [newsToEdit, setNewsToEdit] = useState(null);

  const [availableTags, setAvailableTags] = useState([]);
  const [availableAuthors, setAvailableAuthors] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchMetadata = async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        try {
            const [tagsRes, authorsRes] = await Promise.all([
                fetch('http://localhost:8080/api/tags', { headers }),
                fetch('http://localhost:8080/api/authors', { headers })
            ]);
            if (tagsRes.ok) setAvailableTags(await tagsRes.ok ? await tagsRes.json() : []);
            if (authorsRes.ok) setAvailableAuthors(await authorsRes.json());
        } catch (e) { console.error("Metadata load error", e); }
    };
    if (user?.organization_id) fetchMetadata();
  }, [user]);


  useEffect(() => {
    const fetchNews = async () => {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (selectedTags.length > 0) params.append('tag_ids', selectedTags.map(t => t.id).join(','));
        if (selectedAuthors.length > 0) params.append('author_ids', selectedAuthors.map(a => a.id).join(','));

        const response = await fetch(`http://localhost:8080/api/news?${params.toString()}`, {
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
    }, [search, selectedTags, selectedAuthors, user, refreshTrigger]);

    if (user && !user.organization_id) return <Onboarding />;

    const displayedNews = showCompanyOnly 
        ? news.filter(item => !item.team_id)
        : news;

    const handleDeleteNews = async (id) => {
        if (!window.confirm("Вы уверены, что хотите удалить эту новость?")) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/news/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                setRefreshTrigger(prev => prev + 1);
            } else {
                alert("Ошибка при удалении");
            }
        } catch (error) {
            console.error("Delete error", error);
        }
    };

    const handleOpenEdit = (news) => {
        setNewsToEdit(news);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setNewsToEdit(null);
    };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" fontWeight="bold">Лента</Typography>
            {user?.role >= 2 && (
                <Button variant="contained" onClick={() => setIsCreateModalOpen(true)}>Создать</Button>
            )}
        </Box>

        <Paper sx={{ p: 2, mb: 4, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                    <TextField
                        fullWidth placeholder="Поиск в новостях..." size="small"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                <Autocomplete
                    multiple
                    size="small"
                    options={availableTags}
                    getOptionLabel={(option) => option.name}
                    value={selectedTags}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, newValue) => setSelectedTags(newValue)}
                    renderInput={(params) => <TextField {...params} label="Теги" placeholder="#фичи" />}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip 
                                    key={key}
                                    label={option.name} 
                                    size="small" 
                                    {...tagProps} 
                                />
                            );
                        })
                    }
                />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                    <Autocomplete
                        multiple size="small"
                        options={availableAuthors}
                        getOptionLabel={(option) => option.full_name}
                        value={selectedAuthors}
                        onChange={(_, newValue) => setSelectedAuthors(newValue)}
                        renderInput={(params) => <TextField {...params} label="Авторы" />}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }} sx={{ textAlign: 'right' }}>
                    <FormControlLabel
                        control={<Checkbox checked={showCompanyOnly} onChange={(e) => setShowCompanyOnly(e.target.checked)} />}
                        label={<BusinessIcon color="action" />}
                    />
                </Grid>
            </Grid>
        </Paper>

        <Grid container spacing={2}>
            {loading ? (
                 [1, 2, 3].map(n => <Grid key={n} size={12}><Skeleton height={160} sx={{ borderRadius: 3 }} /></Grid>)
            ) : displayedNews.map(item => (
                <Grid key={item.id} size={12}>
                    <CompactNewsCard 
                        item={item} 
                        onClick={() => setSelectedNews(item)} 
                        onDelete={handleDeleteNews}
                        onEdit={handleOpenEdit}
                        currentUserId={user?.id}
                        userRole={user?.role}
                    />
                </Grid>
            ))}
        </Grid>


        <CreateNewsModal 
            open={isCreateModalOpen} 
            onClose={handleCloseModal}  
            onSuccess={() => setRefreshTrigger(prev => prev + 1)} 
            initialData={newsToEdit}
        />
        
        <FullNewsModal 
            news={selectedNews} 
            onClose={() => setSelectedNews(null)} 
        />
      </Container>
    </Box>
  );
}

function CompactNewsCard({ item, onClick, onEdit, onDelete, currentUserId, userRole }) {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long'
        });
    };

    const authorId = Number(item.author_id || item.author?.id);
    
    const userId = Number(currentUserId);
    
    const role = Number(userRole);

    const isAuthor = authorId > 0 && userId > 0 && authorId === userId;
    const isAdmin = role >= 3; 
    const canManage = isAuthor || isAdmin;

    return (
        <Card 
            elevation={1}
            sx={{ 
                width: '100%', 
                display: 'flex', 
                borderRadius: 3, 
                height: 160, 
                position: 'relative',
                overflow: 'hidden',
                transition: '0.2s',
                '&:hover': { 
                    boxShadow: 4, 
                    transform: 'translateY(-2px)',
                    '& .news-actions': { opacity: 1 } 
                }
            }}
        >
            <CardActionArea 
                onClick={onClick} 
                sx={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', width: '100%', height: '100%' }}
            >
                {item.image_url && (
                    <CardMedia
                        component="img"
                        sx={{ width: 180, minWidth: 180, maxWidth: 180, height: '100%', objectFit: 'cover' }}
                        image={item.image_url}
                    />
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2, minWidth: 0}}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" noWrap>
                            {item.author?.full_name || 'Traveler'}
                            {item.updated_at && new Date(item.updated_at).getTime() > new Date(item.created_at).getTime() + 1000 && (
                                <span style={{ fontWeight: 'normal', opacity: 0.7 }}> (изм. {formatDate(item.updated_at)})</span>
                            )}
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
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {item.tags.slice(0, 3).map((tag) => ( 
                                <Chip key={tag.id} label={`#${tag.name}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                        </Box>
                    )}
                </Box>
            </CardActionArea>
            
            {canManage && (
                <Box 
                    className="news-actions"
                    sx={{ 
                        position: 'absolute', 
                        right: 8, 
                        bottom: 8, 
                        display: 'flex', 
                        gap: 1, 
                        zIndex: 10,
                        opacity: 0,
                        transition: 'opacity 0.2s ease-in-out',
                        bgcolor: 'rgba(255,255,255,0.9)',
                        borderRadius: 2,
                        p: 0.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                >
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                        <EditIcon fontSize="small" color="primary" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                        <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                </Box>
            )}
        </Card>
    );
}