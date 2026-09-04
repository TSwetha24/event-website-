/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00b386',
          red: '#eb5757',
          yellow: '#f5a623',
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155'
        }
      }
    }
  },
  plugins: []
}
