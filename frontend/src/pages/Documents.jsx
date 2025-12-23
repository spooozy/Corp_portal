import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardActionArea, 
  FormControlLabel, Checkbox, Avatar, Autocomplete, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';

import Onboarding from '../components/Onboarding';
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
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
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
        if (selectedTeams.length > 0) params.append('team_ids', selectedTeams.map(t => t.id).join(','));
        const response = await fetch(`http://localhost:8080/api/documents?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDocs(data);
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
        console.error("Download error:", error);
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h4" fontWeight="bold">Документы</Typography>
                <Typography variant="body1" color="text.secondary">База знаний организации</Typography>
            </Box>
            {user?.role >= 1 && (
                <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setIsModalOpen(true)}>Загрузить</Button>
            )}
        </Box>

        <Paper sx={{ p: 2, mb: 4, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                    <TextField
                        fullWidth placeholder="Поиск..." size="small"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                    <Autocomplete
                        multiple size="small" options={availableTags} getOptionLabel={(o) => o.name}
                        value={selectedTags} isOptionEqualToValue={(o, v) => o.id === v.id}
                        onChange={(_, v) => setSelectedTags(v)}
                        renderInput={(p) => <TextField {...p} label="Теги" />}
                        renderTags={(value, getTagProps) =>
                            value.map((o, i) => {
                                const { key, ...tagProps } = getTagProps({ index: i });
                                return <Chip key={key} label={o.name} size="small" {...tagProps} />;
                            })
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
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
                            renderTags={(value, getTagProps) =>
                                value.map((o, i) => {
                                    const { key, ...tagProps } = getTagProps({ index: i });
                                    return <Chip key={key} label={o.name} size="small" {...tagProps} />;
                                })
                            }
                        />
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 2 }} sx={{ textAlign: 'right' }}>
                    <FormControlLabel
                        control={<Checkbox checked={showCompanyOnly} onChange={(e) => setShowCompanyOnly(e.target.checked)} />}
                        label={<BusinessIcon fontSize="small" color="action" />}
                    />
                </Grid>
            </Grid>
        </Paper>

        <Grid container spacing={2}>
            {loading ? (
                [1, 2, 3].map((n) => <Grid key={n} size={12}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} /></Grid>)
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
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ru-RU');

    const isAuthor = Number(item.author_id) === Number(currentUserId);
    const isAdmin = Number(userRole) >= 2;
    const canManage = isAuthor || isAdmin;

    return (
        <Card 
            elevation={1}
            sx={{ 
                width: '100%', borderRadius: 3, position: 'relative', transition: '0.2s',
                '&:hover': { boxShadow: 3, transform: 'translateY(-2px)', '& .doc-actions': { opacity: 1 } }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 56, height: 56, mr: 2, flexShrink: 0 }}>
                    <InsertDriveFileIcon fontSize="large" />
                </Avatar>
                
                <Box sx={{ flex: 1, minWidth: 0, pr: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                        <Typography 
                            variant="h6" fontWeight="bold" noWrap 
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}
                            onClick={() => onDownload(item.id, item.title)}
                        >
                            {item.title}
                        </Typography>
                        <Chip 
                            label={item.team_id ? "Команда" : "Организация"} 
                            size="small" variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', flexShrink: 0 }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>{item.description || "Нет описания"}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, overflow: 'hidden' }}>
                            {item.tags?.slice(0, 3).map(tag => <Chip key={tag.id} label={`#${tag.name}`} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />)}
                        </Box>
                        <Typography variant="caption" color="text.secondary">{formatDate(item.created_at)} • {item.author?.full_name}</Typography>
                    </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => onDownload(item.id, item.title)}>
                        <DownloadIcon color="action" />
                    </IconButton>

                    {canManage && (
                        <IconButton 
                            className="doc-actions" size="small" 
                            sx={{ opacity: 0, transition: '0.2s', color: 'error.main' }} 
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>
        </Card>
    );
}