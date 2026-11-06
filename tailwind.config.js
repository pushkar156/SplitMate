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
        foreground: 'var(--text-primary)',
        'foreground-muted': 'var(--text-secondary)',
        border: 'var(--border-color)',
        input: 'var(--border-color)',
        ring: 'var(--accent-primary)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}

