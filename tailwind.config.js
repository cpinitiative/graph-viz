/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        surface: '#ffffff',
        'surface-container-low': '#f9fafb',
        'surface-container': '#f3f4f6',
        'surface-container-high': '#e5e7eb',
        'surface-container-highest': '#d1d5db',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#111827',
        primary: '#2563eb',
        'on-primary': '#ffffff',
        'outline-variant': '#e5e7eb',
        outline: '#6b7280',

        // Dark mode colors
        'dark-surface': '#121212',
        'dark-surface-container-low': '#111827',
        'dark-surface-container': '#1f2937',
        'dark-surface-container-high': '#2a3942',
        'dark-surface-container-highest': '#374151',
        'dark-surface-container-lowest': '#0b1220',
        'dark-on-surface': '#e2e8f0',
        'dark-primary': '#3182ce',
        'dark-on-primary': '#ffffff',
        'dark-outline-variant': '#4a5568',
        'dark-outline': '#718096',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0 0px 4px rgba(0, 0, 0, 0.1)',
        'ambient-lg': '0px 4px 12px rgba(0, 0, 0, 0.1)',
        xs: '0 0 0 1px rgba(0, 0, 0, 0.05)',
        solid: '0 0 0 2px currentColor',
      },
    },
  },
  plugins: [],
};
