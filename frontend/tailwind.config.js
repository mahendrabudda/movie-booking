/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          950: '#090b10',
          900: '#0f131d',
          800: '#181f2e',
          700: '#252f45',
          accent: '#f59e0b',
          crimson: '#e11d48'
        }
      }
    },
  },
  plugins: [],
};
