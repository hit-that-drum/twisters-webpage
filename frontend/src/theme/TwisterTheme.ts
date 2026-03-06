import { createTheme } from '@mui/material/styles';

export const twisterPalette = {
  primary: {
    '100': '#bae0ff',
    '200': '#91caff',
    '400': '#4096ff',
    '700': '#003eb3',
    '900': '#001d66',
    lighter: '#e6f4ff',
    light: '#8AC0FF',
    main: '#248AFF',
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

const twisterCssVariableEntries = Object.entries(twisterPalette).flatMap(([colorName, colorScale]) =>
  Object.entries(colorScale).map(([scaleKey, value]) => [`--twister-${colorName}-${scaleKey}`, value] as const),
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
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': twisterCssVariables,
        body: {
          backgroundColor: twisterPalette.grey['50'],
          color: twisterPalette.secondary['800'],
        },
      },
    },
  },
});
