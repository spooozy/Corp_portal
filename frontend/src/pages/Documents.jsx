import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardActionArea, 
  FormControlLabel, Checkbox, Avatar, Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import BusinessIcon from '@mui/icons-material/Business';

import UploadDocumentModal from '../components/UploadDocumentModal';

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [showCompanyOnly, setShowCompanyOnly] = useState(false);

  const [availableTags, setAvailableTags] = useState([]);
  const [availableAuthors, setAvailableAuthors] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
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
            if (tagsRes.ok) setAvailableTags(await tagsRes.json());
            if (authorsRes.ok) setAvailableAuthors(await authorsRes.json());
        } catch (e) { console.error("Metadata load error", e); }
    };
    if (user?.organization_id) fetchMetadata();
  }, [user]);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (selectedTags.length > 0) params.append('tag_ids', selectedTags.map(t => t.id).join(','));
        if (selectedAuthors.length > 0) params.append('author_ids', selectedAuthors.map(a => a.id).join(','));

        const response = await fetch(`http://localhost:8080/api/documents?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDocs(data);
        }
      } catch (error) {
        console.error("Ошибка загрузки документов", error);
      } finally {
        setLoading(false);
      }
    };
    const timeoutId = setTimeout(fetchDocs, 400);
    return () => clearTimeout(timeoutId);
  }, [search, selectedTags, selectedAuthors, user, refreshTrigger]);

  const displayedDocs = showCompanyOnly 
    ? docs.filter(item => !item.team_id) 
    : docs;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h4" fontWeight="bold">Документы</Typography>
                <Typography variant="body1" color="text.secondary">База знаний и файлы</Typography>
            </Box>
            {user?.role >= 1 && (
                <Button 
                    variant="contained" color="primary" startIcon={<CloudUploadIcon />}
                    onClick={() => setIsModalOpen(true)}
                >
                    Загрузить
                </Button>
            )}
        </Box>

        <Paper sx={{ p: 2, mb: 4, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                    <TextField
                        fullWidth placeholder="Поиск документов..." variant="outlined" size="small"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    />
                </Grid>
                
                <Grid size={{ xs: 12, sm: 5 }}>
                    <Autocomplete
                        multiple size="small"
                        options={availableTags}
                        getOptionLabel={(option) => option.name}
                        value={selectedTags}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, newValue) => setSelectedTags(newValue)}
                        renderInput={(params) => <TextField {...params} label="Теги" />}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({ index });
                                return <Chip key={key} label={option.name} size="small" {...tagProps} />;
                            })
                        }
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 5 }}>
                    <Autocomplete
                        multiple size="small"
                        options={availableAuthors}
                        getOptionLabel={(option) => option.full_name || ''}
                        value={selectedAuthors}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, newValue) => setSelectedAuthors(newValue)}
                        renderInput={(params) => <TextField {...params} label="Авторы" />}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }} sx={{ textAlign: 'right' }}>
                    <FormControlLabel
                        control={<Checkbox checked={showCompanyOnly} onChange={(e) => setShowCompanyOnly(e.target.checked)} />}
                        label={<BusinessIcon fontSize="small" color="action" />}
                        sx={{ mr: 0 }}
                    />
                </Grid>
            </Grid>
        </Paper>

        <Grid container spacing={2}>
            {loading ? (
                [1, 2, 3].map((n) => <Grid key={n} size={12}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} /></Grid>)
            ) : displayedDocs.length > 0 ? (
                displayedDocs.map((item) => (
                    <Grid key={item.id} size={12}>
                        <DocumentCard item={item} />
                    </Grid>
                ))
            ) : (
                <Grid size={12} sx={{ textAlign: 'center', mt: 4 }}>
                    <InsertDriveFileIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                    <Typography color="text.secondary">Документы не найдены</Typography>
                </Grid>
            )}
        </Grid>

        <UploadDocumentModal 
            open={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => setRefreshTrigger(prev => prev + 1)} 
        />
      </Container>
    </Box>
  );
}

function DocumentCard({ item }) {
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ru-RU');

    return (
        <Card 
            elevation={1}
            sx={{ 
                width: '100%', 
                borderRadius: 3, 
                transition: '0.2s',
                '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }
            }}
        >
            <CardActionArea
                href={item.file_url} 
                target="_blank" 
                download
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'row',
                    alignItems: 'center', 
                    p: 2, 
                    width: '100%',
                    justifyContent: 'flex-start'
                }}
            >
                <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 56, height: 56, mr: 2, flexShrink: 0 }}>
                    <InsertDriveFileIcon fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1 }}>
                            {item.title}
                        </Typography>
                        <Chip 
                            label={item.team_id ? "Команда" : "Организация"} 
                            size="small" 
                            color={item.team_id ? "primary" : "default"} 
                            variant="outlined"
                            sx={{ ml: 1, height: 24, flexShrink: 0 }}
                        />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                        {item.description || "Нет описания"}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, overflow: 'hidden', flex: 1 }}>
                            {item.tags?.slice(0, 3).map(tag => (
                                <Chip key={tag.id} label={`#${tag.name}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {formatDate(item.created_at)} • {item.author?.full_name}
                        </Typography>
                    </Box>
                </Box>
                <DownloadIcon color="action" sx={{ ml: 2, flexShrink: 0 }} />
            </CardActionArea>
        </Card>
    );
}