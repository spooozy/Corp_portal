import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardActionArea, 
  FormControlLabel, Checkbox, Avatar, Autocomplete, IconButton, useTheme, alpha, Tooltip
} from '@mui/material';

import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import Onboarding from '../components/Onboarding';
import UploadDocumentModal from '../components/UploadDocumentModal';

export default function Documents() {
  const { user } = useAuth();
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main;

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [showCompanyOnly, setShowCompanyOnly] = useState(false);
  
  const [availableTags, setAvailableTags] = useState([]);
  const [availableAuthors, setAvailableAuthors] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        } catch (e) { console.error("Metadata error", e); }
    };
    if (user?.organization_id) fetchMetadata();
  }, [user, isAdminPlus]);

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
        if (selectedTeams.length > 0) params.append('team_ids', selectedTeams.map(t => t.id).join(','));
        
        const response = await fetch(`http://localhost:8080/api/documents?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDocs(Array.isArray(data) ? data : []);
        }
      } catch (error) { console.error("Load error", error); }
      finally { setLoading(false); }
    };
    const timeoutId = setTimeout(fetchDocs, 400);
    return () => clearTimeout(timeoutId);
  }, [search, selectedTags, selectedAuthors, selectedTeams, user, refreshTrigger]);

  const handleDownload = async (docId, fallbackName) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/documents/download/${docId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Ошибка скачивания');

        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = fallbackName || 'document';
        
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = decodeURIComponent(fileNameMatch[1]);
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert("Не удалось скачать файл");
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm("Удалить документ навсегда?")) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8080/api/documents/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setRefreshTrigger(p => p + 1);
    } catch (e) { console.error(e); }
  };

  if (user && !user.organization_id) return <Onboarding />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 2 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.03em' }}>Документы</Typography>
                <Typography variant="body2" color="text.secondary">Централизованная база знаний</Typography>
            </Box>
            {user?.role > 1 && (
                <Button 
                    variant="contained" 
                    disableElevation
                    startIcon={<CloudUploadOutlinedIcon />} 
                    onClick={() => setIsModalOpen(true)}
                    sx={{ borderRadius: '8px', bgcolor: ACCENT_COLOR, textTransform: 'none', fontWeight: 600 }}
                >
                    Загрузить
                </Button>
            )}
        </Box>

        <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                    <TextField
                        fullWidth placeholder="Поиск по названию или описанию..." size="small"
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
                    <Tooltip title="Только документы организации">
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

        <Grid container spacing={2.5}>
            {loading ? (
                [1, 2, 3].map((n) => <Grid key={n} size={12}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: '12px' }} /></Grid>)
            ) : (showCompanyOnly ? docs.filter(d => !d.team_id) : docs).map((item) => (
                <Grid key={item.id} size={12}>
                    <DocumentCard 
                        item={item} 
                        currentUserId={user?.id}
                        userRole={user?.role}
                        onDelete={handleDeleteDoc}
                        onDownload={handleDownload}
                    />
                </Grid>
            ))}
        </Grid>

        <UploadDocumentModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => setRefreshTrigger(p => p + 1)} />
      </Container>
    </Box>
  );
}

function DocumentCard({ item, currentUserId, userRole, onDelete, onDownload }) {
    const theme = useTheme();
    const ACCENT_COLOR = theme.palette.primary.main;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

    const isAuthor = Number(item.author_id || item.author?.id) === Number(currentUserId);
    const isAdmin = Number(userRole) >= 3;
    const canManage = isAuthor || isAdmin;

    return (
        <Card 
            elevation={0}
            sx={{ 
                width: '100%', borderRadius: '12px', position: 'relative', transition: 'all 0.2s ease',
                border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                '&:hover': { 
                    borderColor: ACCENT_COLOR, 
                    transform: 'translateY(-2px)', 
                    '& .doc-actions': { opacity: 1 } 
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2.5 }}>
                <Avatar sx={{ 
                    bgcolor: alpha(ACCENT_COLOR, 0.1), 
                    color: ACCENT_COLOR, 
                    width: 52, height: 52, mr: 3, flexShrink: 0,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: alpha(ACCENT_COLOR, 0.2)
                }}>
                    <DescriptionOutlinedIcon fontSize="medium" />
                </Avatar>
                
                <Box sx={{ flex: 1, minWidth: 0, pr: 8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1.5 }}>
                        <Typography 
                            variant="h6" fontWeight="700" noWrap 
                            sx={{ 
                                cursor: 'pointer', 
                                transition: '0.2s',
                                '&:hover': { color: ACCENT_COLOR, textDecoration: 'underline' } 
                            }}
                            onClick={() => onDownload(item.id, item.title)}
                        >
                            {item.title}
                        </Typography>
                        <Chip 
                            label={item.team_id ? "Команда" : "Организация"} 
                            size="small" variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, borderRadius: '4px', color: 'text.secondary' }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1.5, opacity: 0.8 }}>{item.description || "Нет описания"}</Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, overflow: 'hidden' }}>
                            {item.tags?.slice(0, 3).map(tag => (
                                <Typography key={tag.id} sx={{ fontSize: '0.75rem', color: ACCENT_COLOR, fontWeight: 600 }}>
                                    #{tag.name}
                                </Typography>
                            ))}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                            {formatDate(item.created_at)} • <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{item.author?.full_name}</Box>
                        </Typography>
                    </Box>
                </Box>
                
                <Box sx={{ 
                    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' 
                }}>
                    <IconButton size="small" onClick={() => onDownload(item.id, item.title)} sx={{ color: 'text.secondary', '&:hover': { color: ACCENT_COLOR } }}>
                        <FileDownloadOutlinedIcon fontSize="small" />
                    </IconButton>

                    {canManage && (
                        <IconButton 
                            className="doc-actions" 
                            size="small" 
                            sx={{ 
                                opacity: 0, transition: '0.2s', 
                                color: 'text.secondary', 
                                '&:hover': { color: '#f44336' } 
                            }} 
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>
        </Card>
    );
}