/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette inspired by the Esplendor logo
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F59E0B', // amber
          600: '#F97316', // orange accent
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        surface: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          900: '#111827',
        },
      }
    }
  },
  plugins: [],
}
