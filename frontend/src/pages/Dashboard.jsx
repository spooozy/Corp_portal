import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardMedia, CardActionArea,
  FormControlLabel, Checkbox, Autocomplete, IconButton, useTheme, alpha, Tooltip
} from '@mui/material';


import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';

import Onboarding from '../components/Onboarding';
import CreateNewsModal from '../components/CreateNewsModal';
import FullNewsModal from '../components/FullNewsModal';

export default function Dashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main;

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [showCompanyOnly, setShowCompanyOnly] = useState(false);
  const [newsToEdit, setNewsToEdit] = useState(null);

  const [availableTags, setAvailableTags] = useState([]);
  const [availableAuthors, setAvailableAuthors] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isAdminPlus = user?.role >= 3;

  useEffect(() => {
    const fetchMetadata = async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const requests = [
                fetch('http://localhost:8080/api/tags', { headers }),
                fetch('http://localhost:8080/api/authors', { headers })
            ];
            if (isAdminPlus) {
                requests.push(fetch('http://localhost:8080/api/teamsIn', { headers }));
            }

            const responses = await Promise.all(requests);
            if (responses[0].ok) setAvailableTags(await responses[0].json());
            if (responses[1].ok) setAvailableAuthors(await responses[1].json());
            if (isAdminPlus && responses[2]?.ok) setAvailableTeams(await responses[2].json());
        } catch (e) { console.error(e); }
    };
    if (user?.organization_id) fetchMetadata();
  }, [user, isAdminPlus]);

  useEffect(() => {
    const fetchNews = async () => {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (selectedTags.length > 0) params.append('tag_ids', selectedTags.map(t => t.id).join(','));
        if (selectedAuthors.length > 0) params.append('author_ids', selectedAuthors.map(a => a.id).join(','));
        if (selectedTeams.length > 0) params.append('team_ids', selectedTeams.map(t => t.id).join(','));

        const response = await fetch(`http://localhost:8080/api/news?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) setNews(await response.json());
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    const timeoutId = setTimeout(fetchNews, 400);
    return () => clearTimeout(timeoutId);
  }, [search, selectedTags, selectedAuthors, selectedTeams, user, refreshTrigger]);

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
            if (response.ok) setRefreshTrigger(prev => prev + 1);
        } catch (error) { console.error(error); }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 2 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.03em' }}>Лента</Typography>
            {user?.role >= 2 && (
                <Button 
                    variant="contained" 
                    disableElevation
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setIsCreateModalOpen(true)}
                    sx={{ borderRadius: '8px', bgcolor: ACCENT_COLOR, textTransform: 'none', fontWeight: 600 }}
                >
                    Создать
                </Button>
            )}
        </Box>

        <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                    <TextField
                        fullWidth placeholder="Поиск в новостях..." size="small"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment>,
                            sx: { borderRadius: '8px' }
                        }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: isAdminPlus ? 4 : 5 }}>
                    <Autocomplete
                        multiple size="small" options={availableTags} getOptionLabel={(o) => o.name}
                        value={selectedTags} isOptionEqualToValue={(o, v) => o.id === v.id}
                        onChange={(_, v) => setSelectedTags(v)}
                        renderInput={(p) => <TextField {...p} label="Теги" />}
                        renderTags={(value, getTagProps) =>
                            value.map((o, i) => {
                                const { key, ...tagProps } = getTagProps({ index: i });
                                return <Chip key={key} label={o.name} size="small" variant="outlined" sx={{ borderRadius: '4px' }} {...tagProps} />;
                            })
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: isAdminPlus ? 4 : 5 }}>
                    <Autocomplete
                        multiple size="small" options={availableAuthors} getOptionLabel={(o) => o.full_name || ''}
                        value={selectedAuthors} isOptionEqualToValue={(o, v) => o.id === v.id}
                        onChange={(_, v) => setSelectedAuthors(v)}
                        renderInput={(p) => <TextField {...p} label="Авторы" />}
                    />
                </Grid>
                {isAdminPlus && (
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <Autocomplete
                            multiple size="small" options={availableTeams} getOptionLabel={(o) => o.name || ''}
                            value={selectedTeams} isOptionEqualToValue={(o, v) => o.id === v.id}
                            onChange={(_, v) => setSelectedTeams(v)}
                            renderInput={(p) => <TextField {...p} label="Команды" />}
                        />
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: isAdminPlus ? 1 : 2 }} sx={{ textAlign: 'right' }}>
                    <Tooltip title="Только новости компании">
                        <Checkbox 
                            checked={showCompanyOnly} 
                            onChange={(e) => setShowCompanyOnly(e.target.checked)}
                            icon={<BusinessOutlinedIcon />}
                            checkedIcon={<BusinessOutlinedIcon sx={{ color: ACCENT_COLOR }} />}
                        />
                    </Tooltip>
                </Grid>
            </Grid>
        </Paper>

        <Grid container spacing={3}>
            {loading ? (
                 [1, 2, 3].map(n => <Grid key={n} size={12}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: '12px' }} /></Grid>)
            ) : displayedNews.length > 0 ? (
                displayedNews.map(item => (
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
                ))
            ) : (
                <Grid size={12} sx={{ textAlign: 'center', py: 8 }}>
                    <ArticleOutlinedIcon sx={{ fontSize: 60, color: 'divider', mb: 2 }} />
                    <Typography color="text.secondary">Новостей пока нет</Typography>
                </Grid>
            )}
        </Grid>

        <CreateNewsModal open={isCreateModalOpen} onClose={handleCloseModal} onSuccess={() => setRefreshTrigger(p => p + 1)} initialData={newsToEdit} />
        <FullNewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />
      </Container>
    </Box>
  );
}

function CompactNewsCard({ item, onClick, onEdit, onDelete, currentUserId, userRole }) {
    const theme = useTheme();
    const ACCENT_COLOR = theme.palette.primary.main;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    const authorId = Number(item.author_id || item.author?.id);
    const userId = Number(currentUserId);
    const role = Number(userRole);
    const canManage = (authorId > 0 && userId > 0 && authorId === userId) || role >= 3;

    return (
        <Card 
            elevation={0}
            sx={{ 
                width: '100%', 
                display: 'flex', 
                borderRadius: '12px', 
                minHeight: 150, 
                maxHeight: 185,
                position: 'relative',
                overflow: 'hidden', 
                border: '1px solid', 
                borderColor: 'divider', 
                bgcolor: 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': { 
                    borderColor: ACCENT_COLOR,
                    transform: 'translateY(-2px)',
                    '& .news-actions': { opacity: 1 } 
                }
            }}
        >
            <CardActionArea 
                onClick={onClick} 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'stretch', // Чтобы картинка тянулась на всю высоту
                    width: '100%' 
                }}
            >
                {item.image_url && (
                    <CardMedia
                        component="img"
                        sx={{ 
                            width: 220, 
                            minWidth: 220, 
                            maxWidth: 220, 
                            height: 'auto', 
                            objectFit: 'cover', 
                            borderRight: '1px solid', 
                            borderColor: 'divider' 
                        }}
                        image={item.image_url}
                    />
                )}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    flex: 1, 
                    p: 2.5, // Комфортные отступы
                    minWidth: 0,
                    justifyContent: 'center' // Центрируем текст по вертикали, если его мало
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: ACCENT_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {item.author?.full_name || 'System'}
                            {item.updated_at && new Date(item.updated_at).getTime() > new Date(item.created_at).getTime() + 1000 && (
                                <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400, ml: 1 }}>• изм.</Box>
                            )}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                            {formatDate(item.created_at)}
                        </Typography>
                    </Box>

                    <Typography 
                        variant="h6" 
                        fontWeight="700" 
                        sx={{ 
                            // ИСПРАВЛЕНИЕ 2: Немного увеличиваем lineHeight, чтобы не обрезались "хвостики" букв
                            lineHeight: 1.4, 
                            mb: 1, 
                            color: 'text.primary', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            display: '-webkit-box', 
                            WebkitLineClamp: 1, 
                            WebkitBoxOrient: 'vertical' 
                        }}
                    >
                        {item.title}
                    </Typography>

                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: 'text.secondary', 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical', 
                            overflow: 'hidden', 
                            mb: 1.5, // Отступ до тегов
                            lineHeight: 1.5 // Увеличиваем для читаемости
                        }}
                    >
                        {item.content}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                        {item.tags?.slice(0, 3).map((tag) => ( 
                            <Chip 
                                key={tag.id} 
                                label={`#${tag.name}`} 
                                size="small" 
                                variant="outlined" 
                                sx={{ 
                                    height: 22, 
                                    fontSize: '0.7rem', 
                                    borderRadius: '4px', 
                                    borderColor: 'divider', 
                                    color: 'text.secondary' 
                                }} 
                            />
                        ))}
                    </Box>
                </Box>
            </CardActionArea>
            
            {canManage && (
                <Box 
                    className="news-actions"
                    sx={{ 
                        position: 'absolute', right: 12, top: 12, display: 'flex', gap: 1, zIndex: 10,
                        opacity: 0, transition: '0.2s', p: 0.5, borderRadius: '8px',
                        bgcolor: alpha(theme.palette.background.paper, 0.9), 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(item); }} sx={{ color: ACCENT_COLOR }}>
                        <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} sx={{ color: 'text.secondary', '&:hover': { color: '#f44336' } }}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}
        </Card>
    );
}