import { useState, useRef } from 'react';
import { Avatar, Box, IconButton, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const API_BASE_URL = 'http://localhost:8080'; 
const getFullImageUrl = (path) => {
  if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
};

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const AvatarUpload = ({ 
  currentAvatar, 
  onUpload, 
  size = 120,
  editable = true,
  entityType = 'user',
  entityId = null
}) => {
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    if (!event?.target?.files?.[0]) return;
    
    const file = event.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 5MB');
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Недопустимый формат файла. Используйте JPG, PNG, GIF или WebP');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.onerror = () => {
      toast.error('Ошибка чтения файла');
    };
    reader.readAsDataURL(file);
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      let endpoint = '/profile/upload-avatar';
      
      switch(entityType) {
        case 'user':
          if (!entityId) {
            endpoint = '/profile/upload-avatar';
          } else {
            endpoint = `/users/${entityId}/avatar`;
          }
          break;
        case 'team':
          if (!entityId) {
            toast.error('ID команды не указан');
            return;
          }
          endpoint = `/teams/${entityId}/upload-avatar`;
          break;
        case 'organization':
          if (!entityId) {
            toast.error('ID организации не указан');
            return;
          }
          endpoint = `/organizations/${entityId}/upload-avatar`;
          break;
        }

        console.log('Uploading to:', endpoint);
        
        // Используем PUT для обновления, POST для создания
        const method = entityType === 'user' && entityId ? 'put' : 'post';
        const response = await api[method](endpoint, formData, {
            headers: {
            'Content-Type': 'multipart/form-data',
            },
        });

        console.log('Upload success:', response.data);

        toast.success('Аватар успешно загружен');
        if (onUpload && response.data.avatar_url) {
            onUpload(response.data.avatar_url);
            setPreview(null); 
        }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Ошибка загрузки');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Удалить аватар?')) return;

    try {
      let endpoint = '/profile/remove-avatar';
      
      switch(entityType) {
        case 'user':
          if (!entityId) {
            endpoint = '/profile/remove-avatar';
          } else {
            endpoint = `/users/${entityId}/avatar`;
          }
          break;
        case 'team':
          if (!entityId) {
            toast.error('ID команды не указан');
            return;
          }
          endpoint = `/teams/${entityId}/avatar`;
          break;
        case 'organization':
          if (!entityId) {
            toast.error('ID организации не указан');
            return;
          }
          endpoint = `/organizations/${entityId}/avatar`;
          break;
      }

      const response = await api.delete(endpoint);

      if (response.data) {
        setPreview(null);
        toast.success('Аватар удален');
        if (onUpload) {
          onUpload('');
        }
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error(error.response?.data?.error || 'Ошибка удаления аватара');
    }
  };

  const getInitials = () => {
    if (entityType === 'user' && !currentAvatar && !preview) {
      return 'U';
    }
    return entityType.charAt(0).toUpperCase();
  };

  const displaySrc = preview || getFullImageUrl(currentAvatar);

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <Avatar
        src={displaySrc}
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          bgcolor: displaySrc ? 'transparent' : 'primary.main',
          border: '3px solid',
          borderColor: 'primary.light',
        }}
      >
        {!displaySrc && getInitials()}
      </Avatar>

      {editable && !isUploading && (
        <>
          <IconButton
            component="label"
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
            disabled={isUploading}
          >
            <CloudUploadIcon />
            <VisuallyHiddenInput
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
          </IconButton>

          {displaySrc && (
            <IconButton
              onClick={handleRemoveAvatar}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                bgcolor: 'error.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'error.dark',
                },
              }}
              disabled={isUploading}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </>
      )}

      {isUploading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
          }}
        >
          <CircularProgress size={40} color="primary" />
        </Box>
      )}
    </Box>
  );
};

export default AvatarUpload;