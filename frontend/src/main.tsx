import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { GoogleOAuthProvider } from '@react-oauth/google'; // 1. 구글 프로바이더 가져오기
import './index.css';
import App from './App.tsx';
import { applyTwisterThemeCssVariables, twisterMuiTheme } from './theme/TwisterTheme';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

applyTwisterThemeCssVariables();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={twisterMuiTheme}>
        <CssBaseline />
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
            <App />
          </SnackbarProvider>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  </StrictMode>,
);
