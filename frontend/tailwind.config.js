/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        crimson: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#e51937',
          600: '#cc122e',
          700: '#a80e25',
        },
        seatblue: {
          500: '#1877f2',
          600: '#1464cc',
        }
      }
    },
  },
  plugins: [],
};
