/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        space: {
          black: '#0B0C10',
          slate: '#1F2833',
          charcoal: '#131720',
        },
        accent: {
          blue: '#66FCF1',
          purple: '#8A2BE2',
        },
        threat: {
          yellow: '#FAD02C',
          orange: '#FF4500',
          green: '#3DF07A',
        },
        ink: {
          DEFAULT: '#E8F6F5',
          muted: '#8A9BA8',
        },
      },
      fontFamily: {
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};
