/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode palette — matchX theme
        'matchx': {
          // Primary: Dark backgrounds
          'bg-base': '#0f1923',
          'bg-surface': '#1a2533',
          'bg-elevated': '#243040',

          // Accent colors
          'accent-green': '#00d4aa',
          'accent-orange': '#ff6b35',

          // Text hierarchy
          'text-primary': '#f0f4f8',
          'text-secondary': '#b8c5d6',
          'text-muted': '#8899aa',
          'text-disabled': '#556677',

          // Borders
          'border-base': '#2a3a4a',
          'border-subtle': '#1f2d39',
        },
        // Design system override
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#22c55e',
        background: '#020617',
      },
      fontFamily: {
        'heading': ['Fira Code', 'monospace'],
        'body': ['Fira Sans', 'system-ui'],
        'sans': ['Fira Sans', 'system-ui'],
        'mono': ['Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
        '4xl': ['36px', '40px'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        'elevation-1': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 4px 8px 0 rgba(0, 0, 0, 0.4)',
        'elevation-3': '0 8px 16px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  darkMode: 'class',
  corePlugins: {},
}
