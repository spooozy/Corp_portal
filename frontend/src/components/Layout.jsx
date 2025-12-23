import { Outlet, Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, 
  Avatar, IconButton, Tooltip, Stack, Divider, useTheme, alpha 
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssignmentIcon from '@mui/icons-material/Assignment'; 
import DescriptionIcon from '@mui/icons-material/Description';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

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
    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
    fontWeight: isActive ? 600 : 500,
    padding: '6px 16px',
    borderRadius: '8px',
    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8' }}>
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          bgcolor: 'background.paper', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 70 }}>
            <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'text.primary', mr: 4 }}>
              <Box sx={{ 
                p: 1, mr: 1.5, borderRadius: 2, 
                bgcolor: 'primary.main', color: 'white', display: 'flex' 
              }}>
                <BusinessIcon />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: -0.5 }}>
                Croco
              </Typography>
            </Box>

            {user && (
              <Stack direction="row" spacing={1} sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                <NavLink to="/" style={navLinkStyle}>
                  Главная
                </NavLink>
                
                {user.organization_id && (
                  <>
                    <NavLink to="/documents" style={navLinkStyle}>
                      <DescriptionIcon sx={{ fontSize: 20 }} />
                      Документы
                    </NavLink>

                    <NavLink to="/tasks" style={navLinkStyle}>
                      <AssignmentIcon sx={{ fontSize: 20 }} />
                      Задачи
                    </NavLink>
                  </>
                )}
              </Stack>
            )}

            <Box display="flex" alignItems="center" gap={2}>
              {user ? (
                <>
                  <Box 
                    component={Link} 
                    to="/profile" 
                    sx={{ 
                      display: 'flex', alignItems: 'center', gap: 1.5, 
                      textDecoration: 'none', 
                      p: 0.5, pr: 2, borderRadius: 50,
                      border: '1px solid', borderColor: 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' }
                    }}
                  >
                    <Avatar 
                      src={getImageUrl(user.avatar_url)} 
                      sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: '1rem' }}
                    >
                      {user.full_name?.[0]}
                    </Avatar>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Typography variant="subtitle2" color="text.primary" fontWeight="600" lineHeight={1.2}>
                        {user.full_name.split(' ')[0]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Профиль
                      </Typography>
                    </Box>
                  </Box>

                  <Divider orientation="vertical" flexItem variant="middle" sx={{ height: 24, my: 'auto' }} />

                  <Tooltip title="Выйти из системы">
                    <IconButton onClick={handleLogout} color="default" size="small">
                      <LogoutIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Button variant="contained" component={Link} to="/login">
                  Войти
                </Button>
              )}
            </Box>

          </Toolbar>
        </Container>
      </AppBar>

      <Container 
        maxWidth={location.pathname === '/tasks' ? 'xl' : 'lg'}
        sx={{ flexGrow: 1, py: 4, display: 'flex', flexDirection: 'column' }}
      >
        <Outlet />
      </Container>
    </Box>
  );
}