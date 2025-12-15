import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Typography, Box, Avatar, Chip, IconButton 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';

export default function FullNewsModal({ news, onClose }) {
  if (!news) return null;

  const isTeamNews = !!news.team_id;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
  };

  const API_BASE_URL = 'http://localhost:8080'; 

  const getImageUrl = (path) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE_URL}${path}`;
  };

  return (
    <Dialog 
      open={!!news} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Chip 
                icon={isTeamNews ? <GroupsIcon /> : <BusinessIcon />} 
                label={isTeamNews ? "Команда" : "Компания"} 
                color={isTeamNews ? "primary" : "default"} 
                size="small" 
                variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
                {formatDate(news.created_at)}
            </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
            {news.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Avatar src={getImageUrl(news.author?.avatar_url)} alt={news.author?.full_name}>
                {news.author?.full_name?.[0]}
            </Avatar>
            <Typography variant="subtitle1" fontWeight="medium">
                {news.author?.full_name}
            </Typography>
        </Box>
        {news.image_url && (
            <Box 
                component="img" 
                src={news.image_url} 
                alt={news.title}
                sx={{ 
                    width: '100%', 
                    maxHeight: 500, 
                    objectFit: 'contain', 
                    borderRadius: 2, 
                    mb: 3,
                    bgcolor: '#f5f5f5' 
                }}
            />
        )}
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', fontSize: '1.1rem', lineHeight: 1.6 }}>
            {news.content}
        </Typography>
        {news.tags && news.tags.length > 0 && (
            <Box sx={{ mt: 4, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {news.tags.map((tag) => (
                    <Chip key={tag.id} label={`#${tag.name}`} />
                ))}
            </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}