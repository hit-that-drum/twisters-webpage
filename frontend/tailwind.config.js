/** @type {import('tailwindcss').Config} */
export default {
  important: true,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /**
       * Twister design tokens for Tailwind – wired to CSS variables.
       * Values come from `twisterPalette` via `twisterCssVariables` in the MUI theme.
       *
       * This keeps Tailwind utilities (bg-gray-100, text-blue-700, etc.)
       * visually aligned with MUI components.
       */
      colors: {
        gray: {
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
        },
        blue: {
          100: 'var(--color-blue-100)',
          200: 'var(--color-blue-200)',
          400: 'var(--color-blue-400)',
          600: 'var(--color-blue-600)',
          700: 'var(--color-blue-700)',
          800: 'var(--color-blue-800)',
          900: 'var(--color-blue-900)',
        },
        emerald: {
          700: 'var(--color-emerald-700)',
        },
        amber: {
          700: 'var(--color-amber-700)',
        },
        red: {
          700: 'var(--color-red-700)',
        },
      },
      /**
       * Rounded radii and shadows to support a soft SaaS look.
       * These utilities are available for future page-level redesigns.
       */
      borderRadius: {
        soft: '12px',
        'card-sm': '14px',
        'card-lg': '18px',
      },
      boxShadow: {
        'card-sm': '0 1px 2px rgba(15, 23, 42, 0.06)',
        'card-md': '0 18px 45px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
};
