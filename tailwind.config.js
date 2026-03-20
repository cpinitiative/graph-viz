/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface': '#ffffff',
        'surface-container-low': '#ffffff',
        'surface-container': '#ffffff',
        'surface-container-high': '#f5f5f5',
        'surface-container-highest': '#e5e5e5',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#000000',
        'primary': '#000000',
        'on-primary': '#ffffff',
        'outline-variant': '#e5e5e5',
        'outline': '#777777',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'ambient': '0 0px 4px rgba(0, 0, 0, 0.1)',
        'ambient-lg': '0px 4px 12px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
