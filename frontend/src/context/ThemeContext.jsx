import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

export const AppThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'light';
  });

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const newMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        return newMode;
      });
    },
  }), []);

  const ACCENT_COLOR = '#7b5ec4ff';

  const theme = useMemo(() => createTheme({
    palette: {
    mode,
    primary: {
        main: ACCENT_COLOR,
    },
    background: {
        default: mode === 'light' ? '#ffffff' : '#111111', 
        paper: mode === 'light' ? '#ffffff' : '#1a1a1a',
    },
    text: {
        primary: mode === 'light' ? '#1a1a1a' : '#ececec',
        secondary: mode === 'light' ? '#707070' : '#959595',
    },
    divider: mode === 'light' ? '#cbcbcbff' : '#2d2d2d',
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { disableElevation: true },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${mode === 'light' ? '#efefef' : '#2f2f2f'}`,
          },
        },
      },
    },
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};