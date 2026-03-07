import { type ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CssBaseline } from '@mui/material';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from '@/features';
import { applyTwisterThemeCssVariables, twisterMuiTheme } from '@/common/lib/theme/twisterTheme';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

applyTwisterThemeCssVariables();

export function AppProviders({ children }: { children: ReactNode }) {
  const appContent = (
    <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
      <AuthProvider>{children}</AuthProvider>
    </SnackbarProvider>
  );

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={twisterMuiTheme}>
        <CssBaseline />
        {GOOGLE_CLIENT_ID ? (
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{appContent}</GoogleOAuthProvider>
        ) : (
          appContent
        )}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
