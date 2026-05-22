/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        erp: {
          navy: '#0f172a',
          primary: '#1e40af',
          accent: '#0891b2',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      boxShadow: {
        erp: '0 14px 35px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
