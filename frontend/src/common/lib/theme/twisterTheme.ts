import { createTheme } from '@mui/material/styles';

/**
 * Twister Design System – color tokens
 *
 * This palette is the single source of truth for:
 * - Brand / primary color
 * - Neutral gray scale
 * - Semantic states (success / warning / error / info)
 *
 * All other systems (Tailwind CSS via CSS variables, MUI theme, custom CSS)
 * should consume colors from here to keep the dashboard visually consistent.
 */
export const twisterPalette = {
  primary: {
    '100': '#bae0ff',
    '200': '#91caff',
    '400': '#4096ff',
    '700': '#003eb3',
    '900': '#001d66',
    lighter: '#e6f4ff',
    light: '#8AC0FF',
    main: '#248AFF', // Primary brand blue
    dark: '#0058BD',
    darker: '#002c8c',
    contrastText: '#fff',
  },
  secondary: {
    '100': '#f5f5f5',
    '200': '#f0f0f0',
    '400': '#bfbfbf',
    '600': '#595959',
    '800': '#141414',
    lighter: '#f5f5f5',
    light: '#d9d9d9',
    main: '#8c8c8c',
    dark: '#262626',
    darker: '#000000',
    A100: '#ffffff',
    A200: '#434343',
    A300: '#1f1f1f',
    contrastText: '#ffffff',
  },
  error: {
    lighter: '#ffe0d9',
    light: '#ffa290',
    main: '#ff242b',
    dark: '#a42420',
    darker: '#521a14',
    contrastText: '#fff',
  },
  warning: {
    lighter: '#fffbe6',
    light: '#ffd666',
    main: '#faad14',
    dark: '#ad6800',
    darker: '#613400',
    contrastText: '#f5f5f5',
  },
  info: {
    lighter: '#e6fffb',
    light: '#5cdbd3',
    main: '#13c2c2',
    dark: '#006d75',
    darker: '#002329',
    contrastText: '#fff',
  },
  success: {
    lighter: '#E6FFEE',
    light: '#8AFFB3',
    main: '#00D248',
    dark: '#008000',
    darker: '#005900',
    contrastText: '#fff',
  },
  grey: {
    '0': '#ffffff',
    '50': '#fafafa',
    '100': '#f0f0f0',
    '200': '#e5e5e5',
    '300': '#d9d9d9',
    '350': '#ccc',
    '400': '#bfbfbf',
    '500': '#888',
    '600': '#666',
    '700': '#444',
    '800': '#141414',
    '900': '#000000',
    A50: '#fafafb',
    A100: '#fafafa',
    A200: '#bfbfbf',
    A400: '#434343',
    A700: '#1f1f1f',
    A800: '#e6ebf1',
  },
} as const;

const twisterCssVariableEntries = Object.entries(twisterPalette).flatMap(
  ([colorName, colorScale]) =>
    Object.entries(colorScale).map(
      ([scaleKey, value]) => [`--twister-${colorName}-${scaleKey}`, value] as const,
    ),
);

const twisterVariables = twisterCssVariableEntries.reduce<Record<string, string>>(
  (accumulator, [variableName, value]) => {
    accumulator[variableName] = value;
    return accumulator;
  },
  {},
);

const tailwindColorAliases: Record<string, string> = {
  '--color-white': twisterPalette.grey['0'],
  '--color-gray-50': twisterPalette.grey['50'],
  '--color-gray-100': twisterPalette.grey['100'],
  '--color-gray-200': twisterPalette.grey['200'],
  '--color-gray-300': twisterPalette.grey['300'],
  '--color-gray-400': twisterPalette.grey['400'],
  '--color-gray-500': twisterPalette.grey['500'],
  '--color-gray-600': twisterPalette.grey['600'],
  '--color-gray-700': twisterPalette.grey['700'],
  '--color-gray-800': twisterPalette.grey['800'],
  '--color-gray-900': twisterPalette.grey['900'],
  '--color-blue-100': twisterPalette.primary['100'],
  '--color-blue-200': twisterPalette.primary['200'],
  '--color-blue-400': twisterPalette.primary['400'],
  '--color-blue-600': twisterPalette.primary.main,
  '--color-blue-700': twisterPalette.primary.dark,
  '--color-blue-800': twisterPalette.primary['700'],
  '--color-blue-900': twisterPalette.primary['900'],
  '--color-red-700': twisterPalette.error.dark,
  '--color-amber-700': twisterPalette.warning.dark,
  '--color-emerald-700': twisterPalette.success.dark,
};

export const twisterCssVariables = {
  ...twisterVariables,
  ...tailwindColorAliases,
};

export const applyTwisterThemeCssVariables = () => {
  if (typeof document === 'undefined') {
    return;
  }

  Object.entries(twisterCssVariables).forEach(([variableName, value]) => {
    document.documentElement.style.setProperty(variableName, value);
  });
};

/**
 * Twister MUI theme – unified B2B SaaS dashboard styling
 *
 * This theme encodes:
 * - Color system (palette)
 * - Typography scale (h1 ~ body2)
 * - 4px spacing grid
 * - Border radius standard
 * - Core component styles (buttons, cards, inputs, dialogs, snackbars, tables)
 */
export const twisterMuiTheme = createTheme({
  palette: {
    primary: {
      light: twisterPalette.primary.light,
      main: twisterPalette.primary.main,
      dark: twisterPalette.primary.dark,
      contrastText: twisterPalette.primary.contrastText,
    },
    secondary: {
      light: twisterPalette.secondary.light,
      main: twisterPalette.secondary.main,
      dark: twisterPalette.secondary.dark,
      contrastText: twisterPalette.secondary.contrastText,
    },
    error: {
      light: twisterPalette.error.light,
      main: twisterPalette.error.main,
      dark: twisterPalette.error.dark,
      contrastText: twisterPalette.error.contrastText,
    },
    warning: {
      light: twisterPalette.warning.light,
      main: twisterPalette.warning.main,
      dark: twisterPalette.warning.dark,
      contrastText: twisterPalette.warning.contrastText,
    },
    info: {
      light: twisterPalette.info.light,
      main: twisterPalette.info.main,
      dark: twisterPalette.info.dark,
      contrastText: twisterPalette.info.contrastText,
    },
    success: {
      light: twisterPalette.success.light,
      main: twisterPalette.success.main,
      dark: twisterPalette.success.dark,
      contrastText: twisterPalette.success.contrastText,
    },
    grey: {
      50: twisterPalette.grey['50'],
      100: twisterPalette.grey['100'],
      200: twisterPalette.grey['200'],
      300: twisterPalette.grey['300'],
      400: twisterPalette.grey['400'],
      500: twisterPalette.grey['500'],
      600: twisterPalette.grey['600'],
      700: twisterPalette.grey['700'],
      800: twisterPalette.grey['800'],
      900: twisterPalette.grey['900'],
      A100: twisterPalette.grey.A100,
      A200: twisterPalette.grey.A200,
      A400: twisterPalette.grey.A400,
      A700: twisterPalette.grey.A700,
    },
    text: {
      primary: twisterPalette.secondary['800'],
      secondary: twisterPalette.grey['600'],
    },
    background: {
      default: twisterPalette.grey['50'],
      paper: twisterPalette.grey['0'],
    },
    divider: twisterPalette.grey['200'],
  },
  /**
   * 4px spacing grid
   * MUI spacing utilities will now map 1 → 4px, 2 → 8px, etc.
   */
  spacing: 4,
  /**
   * Border radius standard
   * - Small controls: 10–12px
   * - Cards / surfaces: 16px
   */
  shape: {
    borderRadius: 12,
  },
  /**
   * Typography scale tuned for dashboard-style UI.
   * These values apply to MUI Typography components and MUI-based controls.
   */
  typography: {
    // fontFamily:
    //   "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, -system-ui, 'Segoe UI', sans-serif",
    fontFamily: [
      "'Noto Sans KR'",
      '-apple-system',
      'BlinkMacSystemFont',
      "'SF Pro Text'",
      'system-ui',
      "'Segoe UI'",
      'sans-serif',
    ].join(', '),
    h1: {
      fontSize: '2rem', // 32px
      lineHeight: 1.25,
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontSize: '1.75rem', // 28px
      lineHeight: 1.3,
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '1.5rem', // 24px
      lineHeight: 1.3,
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.375rem', // 22px
      lineHeight: 1.35,
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem', // 20px
      lineHeight: 1.4,
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.0625rem', // 17px
      lineHeight: 1.4,
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '0.9375rem', // 15px
      lineHeight: 1.5,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.9375rem', // 15px
      lineHeight: 1.6,
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.6,
      fontWeight: 400,
    },
    button: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: 0,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      fontWeight: 500,
    },
    overline: {
      fontSize: '0.6875rem',
      lineHeight: 1.6,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },
  components: {
    /**
     * Global CSS variables + base background / text color.
     * Tailwind utilities will sit above this in the cascade,
     * but the variables are used by both systems.
     */
    MuiCssBaseline: {
      styleOverrides: {
        ':root': twisterCssVariables,
        body: {
          backgroundColor: twisterPalette.grey['50'],
          color: twisterPalette.secondary['800'],
        },
      },
    },
    /**
     * Buttons – primary CTAs and secondary actions.
     * Used across pages (Notice, Settlement, Member, Login dialogs, etc.).
     */
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 9999,
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: 16,
          paddingBlock: 8,
          letterSpacing: 0,
        },
        sizeSmall: {
          paddingInline: 12,
          paddingBlock: 6,
          borderRadius: 9999,
        },
        sizeLarge: {
          paddingInline: 20,
          paddingBlock: 10,
          borderRadius: 9999,
        },
        contained: {
          boxShadow: 'none',
          backgroundColor: twisterPalette.primary.main,
          color: twisterPalette.primary.contrastText,
          '&:hover': {
            backgroundColor: twisterPalette.primary.dark,
            boxShadow: 'none',
          },
          '&:active': {
            backgroundColor: twisterPalette.primary.darker,
          },
          '&.Mui-disabled': {
            backgroundColor: twisterPalette.grey['200'],
            color: twisterPalette.grey['500'],
          },
        },
        outlined: {
          borderColor: twisterPalette.grey['300'],
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: twisterPalette.primary['200'],
            backgroundColor: twisterPalette.primary.lighter,
          },
        },
        text: {
          paddingInline: 8,
          paddingBlock: 4,
          borderRadius: 9999,
        },
      },
    },
    /**
     * Cards / surfaces – used implicitly via Paper in dialogs and other surfaces.
     * Gives a soft, premium SaaS feel.
     */
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        outlined: {
          borderColor: twisterPalette.grey['200'],
        },
      },
    },
    /**
     * Form fields – TextField, OutlinedInput, labels.
     * Shared by Login dialog, Member / Settlement / Notice forms, etc.
     */
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: twisterPalette.grey['0'],
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: twisterPalette.grey['200'],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: twisterPalette.primary['200'],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: twisterPalette.primary.main,
            boxShadow: `0 0 0 1px ${twisterPalette.primary.lighter}`,
          },
        },
        input: {
          paddingBlock: 10,
          paddingInline: 12,
          fontSize: '0.875rem',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          color: twisterPalette.grey['600'],
        },
      },
    },
    /**
     * Dialogs / modals – login reset, Notice / Settlement / Member dialogs.
     */
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          paddingInline: 4,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1.0625rem',
        },
      },
    },
    /**
     * Snackbar / toast notifications – used via notistack.
     */
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: 9999,
            paddingInline: 16,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          paddingInline: 16,
          paddingBlock: 8,
          fontSize: '0.8125rem',
        },
        icon: {
          fontSize: '1.1rem',
        },
      },
    },
    /**
     * Tables & DataGrid – baseline visual language for tabular data.
     * Individual pages (e.g. Settlement) can still refine via sx.
     */
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: twisterPalette.grey['50'],
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: twisterPalette.grey['700'],
        },
        body: {
          fontSize: '0.875rem',
        },
      },
    },
  },
});
