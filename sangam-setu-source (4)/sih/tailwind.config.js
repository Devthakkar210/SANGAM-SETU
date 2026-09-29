/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0A1433', 900: '#101E4A', 800: '#1A2B63', 700: '#26397D', 600: '#34499A', 100: '#E4E8F5', 50: '#F2F4FA' },
        saffron: { 700: '#B8560A', 600: '#D9680F', 500: '#F08A24', 400: '#F6A457', 100: '#FDEBD8', 50: '#FEF6EE' },
        leaf: { 700: '#1C6B4A', 600: '#23855C', 500: '#2F9E6E', 100: '#DDF1E6', 50: '#EFF8F3' },
        paper: '#F7F8FB',
        ink: '#18203A',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Noto Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Gujarati"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,30,74,.06), 0 4px 16px -6px rgba(16,30,74,.10)',
        lift: '0 12px 32px -12px rgba(16,30,74,.28)',
      },
    },
  },
  plugins: [],
}
