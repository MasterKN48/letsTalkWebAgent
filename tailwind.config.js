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
        'brand-pink': '#FFD1DC',
        'brand-lilac': '#E6E6FA',
        'brand-mint': '#F0FFF0',
        'brand-primary': '#FF69B4',
        'brand-secondary': '#9370DB',
        'brand-dark-bg': '#121212',
        'brand-dark-card': '#1E1E1E',
      },
      borderRadius: {
        'xl': '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: .8, transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}

