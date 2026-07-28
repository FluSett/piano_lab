/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070a11',
          900: '#0b0f19',
          800: '#131b2e',
          700: '#1e293b',
          600: '#334155',
        },
        emerald: {
           glow: '#10b981',
           accent: '#34d399',
        },
        amber: {
          glow: '#f59e0b',
        },
        cyan: {
          glow: '#06b6d4',
        },
      },
      boxShadow: {
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.4)',
      },
    },
  },
  plugins: [],
};
