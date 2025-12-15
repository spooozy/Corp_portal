import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Typography, Container, Grid, Paper, TextField, 
  InputAdornment, Button, Chip, Skeleton, Card, CardActionArea, 
  FormControlLabel, Checkbox, Avatar 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'; // Иконка файла
import DownloadIcon from '@mui/icons-material/Download';
import BusinessIcon from '@mui/icons-material/Business';

import Onboarding from '../components/Onboarding';
import UploadDocumentModal from '../components/UploadDocumentModal';

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCompanyOnly, setShowCompanyOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/documents?search=${search}`, {
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
    const timeoutId = setTimeout(fetchDocs, 500);
    return () => clearTimeout(timeoutId);
  }, [search, user, refreshTrigger]);

  if (user && !user.organization_id) return <Onboarding />;

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
            {user?.role >= 1 && ( // Разрешаем сотрудникам (1+) или менеджерам (2+) загружать? Решать вам.
                <Button 
                    variant="contained" color="primary" startIcon={<CloudUploadIcon />}
                    onClick={() => setIsModalOpen(true)}
                >
                    Загрузить
                </Button>
            )}
        </Box>

        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
                placeholder="Поиск документов..." variant="outlined" size="small"
                value={search} onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: '200px' }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <FormControlLabel
                control={<Checkbox checked={showCompanyOnly} onChange={(e) => setShowCompanyOnly(e.target.checked)} />}
                label={<Typography variant="body2" sx={{ display: 'flex', gap: 0.5 }}><BusinessIcon fontSize="small"/></Typography>}
            />
        </Paper>

        <Grid container spacing={2}>
            {loading ? (
                [1, 2, 3].map((n) => <Grid item xs={12} key={n}><Skeleton height={100} sx={{ borderRadius: 3 }} /></Grid>)
            ) : displayedDocs.length > 0 ? (
                displayedDocs.map((item) => (
                    <Grid item xs={12} key={item.id}>
                        <DocumentCard item={item} />
                    </Grid>
                ))
            ) : (
                <Grid item xs={12} sx={{ textAlign: 'center', mt: 4 }}>
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

// Карточка документа
function DocumentCard({ item }) {
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ru-RU');

    return (
        <Card 
            elevation={1}
            sx={{ 
                width: '100%', borderRadius: 3, transition: '0.2s',
                '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }
            }}
        >
            <CardActionArea 
                // Ссылка на скачивание
                href={item.file_url} 
                target="_blank" 
                download
                sx={{ display: 'flex', alignItems: 'center', p: 2, width: '100%' }}
            >
                {/* Иконка файла слева */}
                <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 56, height: 56, mr: 2 }}>
                    <InsertDriveFileIcon fontSize="large" />
                </Avatar>

                {/* Инфо */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="h6" fontWeight="bold" noWrap>
                            {item.title}
                        </Typography>
                        <Chip 
                            label={item.team_id ? "Команда" : "Организация"} 
                            size="small" 
                            color={item.team_id ? "primary" : "default"} 
                            variant="outlined"
                            sx={{ ml: 1, height: 24 }}
                        />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                        {item.description || "Нет описания"}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Тэги */}
                        <Box sx={{ display: 'flex', gap: 0.5, overflow: 'hidden' }}>
                            {item.tags?.slice(0, 3).map(tag => (
                                <Chip key={tag.id} label={`#${tag.name}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                        </Box>
                        
                        {/* Дата и автор */}
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(item.created_at)} • {item.author?.full_name}
                        </Typography>
                    </Box>
                </Box>
                
                {/* Иконка скачивания справа */}
                <DownloadIcon color="action" sx={{ ml: 2 }} />
            </CardActionArea>
        </Card>
    );
}