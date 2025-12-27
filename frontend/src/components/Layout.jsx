import { Outlet, Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../context/ThemeContext';
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, 
  Avatar, IconButton, Tooltip, Stack, Divider, alpha,
  useTheme
} from '@mui/material';

import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'; 
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

export default function Layout() {
  const { user, logout } = useAuth();
  const { toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const ACCENT_COLOR = theme.palette.primary.main; 
  const isDark = theme.palette.mode === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getImageUrl = (path) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `http://localhost:8080${path}`;
  };

  const navLinkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.875rem',
    padding: '6px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: isActive ? alpha(ACCENT_COLOR, 0.12) : 'transparent',
    '&:hover': {
      backgroundColor: isActive ? alpha(ACCENT_COLOR, 0.18) : alpha(ACCENT_COLOR, 0.05),
      color: theme.palette.text.primary
    },
    '& svg': {
      color: isActive ? ACCENT_COLOR : 'inherit',
    }
  });

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: 'background.default',
      transition: 'background 0.3s ease' 
    }}>
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          bgcolor: alpha(theme.palette.background.paper, 0.8), 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 64 }}>
            
            <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'text.primary' }}>
              <Box sx={{ 
                p: 0.8, mr: 1.2, borderRadius: 1.5, 
                bgcolor: ACCENT_COLOR, color: '#fff', display: 'flex',
                boxShadow: isDark ? `0 0 15px ${alpha(ACCENT_COLOR, 0.4)}` : `0 4px 10px ${alpha(ACCENT_COLOR, 0.3)}`
              }}>
                <BusinessOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em' }}>
                Croco
              </Typography>
            </Box>

            {user && (
              <Stack direction="row" spacing={1} sx={{ flexGrow: 1, ml: 6, display: { xs: 'none', md: 'flex' } }}>
                <NavLink to="/" style={navLinkStyle}>
                  <HomeOutlinedIcon sx={{ fontSize: 18 }} />
                  Главная
                </NavLink>
                {user.organization_id && (
                  <>
                    <NavLink to="/documents" style={navLinkStyle}>
                      <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
                      Документы
                    </NavLink>
                    <NavLink to="/tasks" style={navLinkStyle}>
                      <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />
                      Задачи
                    </NavLink>
                  </>
                )}
              </Stack>
            )}

            <Box display="flex" alignItems="center" gap={1}>
              
              <Tooltip title={isDark ? "Светлая тема" : "Темная тема"}>
                <IconButton onClick={toggleColorMode} size="small" sx={{ color: 'text.secondary', mr: 1 }}>
                  {isDark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              {user ? (
                <>
                  <Box 
                    component={Link} 
                    to="/profile" 
                    sx={{ 
                      display: 'flex', alignItems: 'center', gap: 1.2, 
                      textDecoration: 'none', 
                      p: '4px 12px 4px 4px', borderRadius: '20px',
                      transition: 'all 0.2s',
                      border: '1px solid transparent',
                      '&:hover': { 
                        bgcolor: alpha(ACCENT_COLOR, 0.05),
                        borderColor: alpha(ACCENT_COLOR, 0.1)
                      }
                    }}
                  >
                    <Avatar 
                      src={getImageUrl(user.avatar_url)} 
                      sx={{ 
                        width: 32, height: 32, 
                        border: `1.5px solid ${alpha(ACCENT_COLOR, 0.2)}`,
                        bgcolor: alpha(ACCENT_COLOR, 0.1), 
                        color: ACCENT_COLOR,
                        fontSize: '0.85rem', fontWeight: 700
                      }}
                    >
                      {user.full_name?.[0]}
                    </Avatar>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                      {user.full_name.split(' ')[0]}
                    </Typography>
                  </Box>

                  <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 2.2, borderColor: 'divider' }} />

                  <Tooltip title="Выход">
                    <IconButton onClick={handleLogout} size="small" sx={{ color: 'text.secondary', '&:hover': { color: '#f44336' } }}>
                      <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Button 
                  component={Link} 
                  to="/login" 
                  sx={{ color: ACCENT_COLOR, fontWeight: 700, textTransform: 'none' }}
                >
                  Войти
                </Button>
              )}
            </Box>

          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Container 
          maxWidth={location.pathname === '/tasks' ? 'xl' : 'lg'}
          sx={{ py: 6 }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}