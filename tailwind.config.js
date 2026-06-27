/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#050810',
          900: '#0a0f1c',
          800: '#111827',
          700: '#1a2236',
          600: '#243049',
        },
        accent: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          pink: '#ec4899',
          emerald: '#34d399',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(34, 211, 238, 0.35)',
        'glow-violet': '0 0 40px -10px rgba(139, 92, 246, 0.35)',
        card: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'mesh': 'radial-gradient(at 20% 20%, rgba(34,211,238,0.12) 0, transparent 50%), radial-gradient(at 80% 0%, rgba(139,92,246,0.15) 0, transparent 45%), radial-gradient(at 60% 100%, rgba(236,72,153,0.08) 0, transparent 40%)',
        'gradient-brand': 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 50%, #ec4899 100%)',
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