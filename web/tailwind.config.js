/**
 * Design tokens for Asta Classic. See DESIGN.md.
 *
 * `colors`, `fontSize`, `borderRadius` and `boxShadow` are REPLACED, not
 * extended: anything outside the documented system simply doesn't compile,
 * which is what keeps the system from drifting back into defaults.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',

      // surfaces — warm graphite, four steps, separated by tone not shadow
      ground: '#100f0d',
      surface: {
        DEFAULT: '#1a1815',
        2: '#24211d',
        3: '#302c27',
      },
      line: {
        DEFAULT: '#3a352f',
        strong: '#4d463e',
      },

      // ink — three levels, all >= 4.5:1 on every surface above
      ink: {
        DEFAULT: '#f2ede6',
        2: '#bcb3a6',
        3: '#a1978a',
      },

      // action — always a fill, never an outline
      live: {
        DEFAULT: '#e8536c',
        hover: '#f06a80',
        press: '#d33e57',
      },

      // status — each means exactly one thing
      warn: '#e8a33d',   // attention: closing timer, admin surface, target star
      free: '#6fbe92',   // available / connected / your team
      danger: '#e5806f', // destructive — always an outline, never a fill

      // categorical: player roles. Outlined chips only, so they can never be
      // mistaken for the filled action colour.
      role: {
        P: '#dfae4d',
        D: '#7fb0e6',
        C: '#6fbe92',
        A: '#ee8270',
      },

      scrim: 'rgba(9, 8, 7, 0.8)',
    },

    fontFamily: {
      display: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
      sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },

    // Every step is paired with its line-height. 11px is the floor.
    fontSize: {
      '2xs': ['11px', { lineHeight: '1.45', letterSpacing: '0.005em' }],
      xs: ['13px', { lineHeight: '1.5' }],
      sm: ['14px', { lineHeight: '1.55' }],
      base: ['16px', { lineHeight: '1.6' }],
      md: ['19px', { lineHeight: '1.4' }],
      lg: ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
      xl: ['32px', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
      '2xl': ['46px', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
    },

    // One radius. Circles are the only exception.
    borderRadius: {
      none: '0',
      DEFAULT: '3px',
      full: '9999px',
    },

    // One shadow, for things that genuinely float above the page.
    boxShadow: {
      none: 'none',
      overlay: '0 16px 40px -12px rgba(0, 0, 0, 0.7)',
    },

    extend: {
      maxWidth: { shell: '1180px' },
    },
  },
  plugins: [],
};
