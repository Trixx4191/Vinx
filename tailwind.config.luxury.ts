import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // COLOR PALETTE
      colors: {
        // Grays (Luxury Base)
        gray: {
          50: '#FAFAFA',
          100: '#F3F3F3',
          200: '#E8E8E8',
          300: '#D3D3D3',
          400: '#A8A8A8',
          500: '#808080',
          600: '#4D4D4D',
          700: '#333333',
          800: '#1A1A1A',
          900: '#0D0D0D',
        },
        // Accents (Collection-Specific)
        celadon: '#ACE5E0',
        'vienna-green': '#6B8E6F',
        'vienna-red': '#8B3A3A',
        gold: '#D4AF37',
        rose: '#E8A7A7',
        // Functional
        success: '#2D5016',
        warning: '#D4941B',
        error: '#8B3A3A',
        info: '#5A7A8C',
      },

      // TYPOGRAPHY
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        luxury: ['"Garamond"', '"Georgia"', '"Didot"', 'serif'],
        serif: ['"Garamond"', '"Georgia"', 'serif'],
        mono: ['"Courier New"', 'monospace'],
      },

      fontSize: {
        // H1-H6 (Headings)
        'h1': ['3.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'h2': ['2.8rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h3': ['2.2rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['1.8rem', { lineHeight: '1.4', fontWeight: '500' }],
        'h5': ['1.4rem', { lineHeight: '1.5', fontWeight: '600' }],
        'h6': ['1.2rem', { lineHeight: '1.6', fontWeight: '600' }],

        // Body
        'body-lg': ['1.1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],

        // Special
        'label': ['0.75rem', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase' }],
        'caption': ['0.7rem', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0.05em', textTransform: 'uppercase' }],

        // Backwards compat (standard Tailwind)
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
      },

      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
        luxury: '0.02em',
      },

      // SPACING (8px base unit)
      spacing: {
        0: '0',
        1: '0.5rem',    // 8px
        2: '1rem',      // 16px
        3: '1.5rem',    // 24px
        4: '2rem',      // 32px
        5: '2.5rem',    // 40px
        6: '3rem',      // 48px
        7: '4rem',      // 64px
        8: '5rem',      // 80px
        9: '6rem',      // 96px
        10: '8rem',     // 128px
      },

      // RESPONSIVE
      screens: {
        xs: '320px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },

      maxWidth: {
        container: '1400px',
      },

      gap: {
        4: '2rem',      // Default for product grids
        6: '3rem',      // Large section gaps
      },

      // SHADOWS (Minimal for luxury)
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },

      // BORDER RADIUS (Luxury = Sharp/Minimal)
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },

      borderColor: {
        DEFAULT: '#E8E8E8',
      },

      // TRANSITIONS
      transitionDuration: {
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },

      transitionTimingFunction: {
        ease: 'ease',
        'ease-in': 'ease-in',
        'ease-out': 'ease-out',
        'ease-in-out': 'ease-in-out',
        linear: 'linear',
      },

      // GRADIENTS
      backgroundImage: {
        'skeleton-loading': 'linear-gradient(90deg, #E8E8E8 25%, #D3D3D3 50%, #E8E8E8 75%)',
      },

      backgroundSize: {
        'skeleton': '200% 100%',
      },

      animation: {
        'skeleton-loading': 'skeleton-loading 1.5s infinite',
      },

      keyframes: {
        'skeleton-loading': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },

  // PLUGINS & UTILITIES
  plugins: [
    // Focus-visible for accessibility
    require('@tailwindcss/forms'),
  ],

  // IMPORTANT ACCESSIBILITY
  corePlugins: {
    // Tailwind defaults are fine, no overrides needed
  },

  // FUTURE (Tailwind v4 stability)
  future: {
    hoverOnlyWhenSupported: true,
  },
};

export default config;
