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

      // Surfaces and ink are deliberately NEUTRAL (a hair cool, R-B <= 0).
      // Warmth in the greys mixes with any accent and the whole page reads as a
      // tinted theme: a warm grey ramp plus an amber label colour reads as
      // gold-on-black. Keeping every neutral neutral is what lets the single
      // accent actually land.
      ground: '#0e0e10',
      surface: {
        DEFAULT: '#17171a',
        2: '#1f1f23',
        3: '#2a2a2f',
      },
      line: {
        DEFAULT: '#33333a',
        strong: '#45454e',
      },

      // ink — three levels, all >= 4.5:1 on every surface above
      ink: {
        DEFAULT: '#f3f3f5',
        2: '#b2b2bb',
        3: '#91919c',
      },

      // The one accent. `soft` is the lighter tint for when the accent must be
      // TEXT rather than a fill, so it still clears 4.5:1 on every surface.
      live: {
        DEFAULT: '#e8536c',
        hover: '#f06a80',
        press: '#d33e57',
        soft: '#f4798d',
      },

      // status — each means exactly one thing
      free: '#5fbf8d',   // available / connected / your team
      danger: '#ef8779', // destructive — always an outline, never a fill

      scrim: 'rgba(6, 6, 8, 0.8)',
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
