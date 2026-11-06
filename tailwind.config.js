/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-main)',
        'background-secondary': 'var(--bg-secondary)',
        card: 'var(--bg-card)',
        'card-elevated': 'var(--bg-elevated)',
        primary: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          muted: 'var(--accent-primary-muted)',
        },
        secondary: {
          DEFAULT: 'var(--accent-secondary)',
          hover: 'var(--accent-secondary-hover)',
          muted: 'var(--accent-secondary-muted)',
        },
        positive: {
          DEFAULT: 'var(--positive-balance)',
          bg: 'var(--positive-bg)',
        },
        negative: {
          DEFAULT: 'var(--negative-balance)',
          bg: 'var(--negative-bg)',
        },
        retro: {
          plum: '#421454',
          berry: '#802C62',
          coral: '#FF5B42',
          gold: '#FFD749',
        },
        foreground: 'var(--text-primary)',
        'foreground-muted': 'var(--text-secondary)',
        border: 'var(--border-color)',
        input: 'var(--border-color)',
        ring: 'var(--accent-primary)',
      },
      fontFamily: {
        sans: ['Outfit', 'Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Outfit', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        'retro': '3px 3px 0px 0px rgba(66, 20, 84, 0.25)',
        'retro-dark': '3px 3px 0px 0px rgba(0, 0, 0, 0.5)',
        'card': '0 4px 12px -2px rgba(66, 20, 84, 0.08), 0 2px 6px -1px rgba(66, 20, 84, 0.04)',
        'elevated': '0 12px 24px -4px rgba(66, 20, 84, 0.14), 0 4px 8px -2px rgba(66, 20, 84, 0.08)',
      }
    },
  },
  plugins: [],
}
