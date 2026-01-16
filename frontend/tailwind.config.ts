import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ac',
          300: '#f6ba77',
          400: '#f19340',
          500: '#ee751b',
          600: '#df5b11',
          700: '#b94410',
          800: '#933715',
          900: '#773014',
        },
        dark: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c4c6ca',
          300: '#9fa2a8',
          400: '#7a7e86',
          500: '#5f636b',
          600: '#4b4e55',
          700: '#3e4046',
          800: '#27282c',
          900: '#18191b',
          950: '#0d0e0f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
