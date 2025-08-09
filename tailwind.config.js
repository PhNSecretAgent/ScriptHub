/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-primary': '#000000',
        'dark-secondary': '#2B2B2B',
      }
    },
  },
  plugins: [],
};
