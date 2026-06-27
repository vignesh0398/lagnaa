/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#030303',
          900: '#0a0a0a',
          800: '#141414',
          700: '#1c1c1c',
          600: '#262626',
        },
        accent: {
          cyan: '#fbbf24',
          violet: '#f59e0b',
          pink: '#fde047',
          emerald: '#34d399',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(251, 191, 36, 0.35)',
        'glow-violet': '0 0 40px -10px rgba(245, 158, 11, 0.35)',
        card: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'mesh': 'radial-gradient(at 18% 18%, rgba(251,191,36,0.12) 0, transparent 50%), radial-gradient(at 82% 8%, rgba(245,158,11,0.1) 0, transparent 45%), radial-gradient(at 55% 92%, rgba(253,224,71,0.06) 0, transparent 40%)',
        'gradient-brand': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fde047 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        DEFAULT: '100ms',
        75: '75ms',
        150: '150ms',
      },
    },
  },
  plugins: [],
}