/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030303',
        card: '#0a0a0c',
        primary: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          200: '#dad7fe',
          300: '#bfb9fe',
          400: '#9e91fd',
          500: '#7c65fc',
          600: '#6741f7',
          700: '#552eeb',
          800: '#4725c5',
          900: '#3c20a2',
          950: '#23116a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
