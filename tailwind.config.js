/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        // matchX theme — values driven by CSS variables (supports dark/light toggle)
        'matchx': {
          'bg-base':        'rgb(var(--matchx-bg-base) / <alpha-value>)',
          'bg-surface':     'rgb(var(--matchx-bg-surface) / <alpha-value>)',
          'bg-elevated':    'rgb(var(--matchx-bg-elevated) / <alpha-value>)',
          'accent-green':   'rgb(var(--matchx-accent-green) / <alpha-value>)',
          'accent-orange':  'rgb(var(--matchx-accent-orange) / <alpha-value>)',
          'text-primary':   'rgb(var(--matchx-text-primary) / <alpha-value>)',
          'text-secondary': 'rgb(var(--matchx-text-secondary) / <alpha-value>)',
          'text-muted':     'rgb(var(--matchx-text-muted) / <alpha-value>)',
          'text-disabled':  'rgb(var(--matchx-text-disabled) / <alpha-value>)',
          'border-base':    'rgb(var(--matchx-border-base) / <alpha-value>)',
          'border-subtle':  'rgb(var(--matchx-border-subtle) / <alpha-value>)',
        },
      },
      fontFamily: {
        'heading': ['Fira Code', 'monospace'],
        'body':    ['Fira Sans', 'system-ui'],
        'sans':    ['Fira Sans', 'system-ui'],
        'mono':    ['Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['12px', '16px'],
        'sm':   ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg':   ['18px', '28px'],
        'xl':   ['20px', '28px'],
        '2xl':  ['24px', '32px'],
        '3xl':  ['30px', '36px'],
        '4xl':  ['36px', '40px'],
      },
      spacing: {
        'xs':  '4px',
        'sm':  '8px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '24px',
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
        'sm':          '0 1px 2px 0 rgba(0,0,0,0.05)',
        'base':        '0 4px 6px -1px rgba(0,0,0,0.1)',
        'md':          '0 10px 15px -3px rgba(0,0,0,0.1)',
        'lg':          '0 20px 25px -5px rgba(0,0,0,0.1)',
        'elevation-1': '0 1px 3px 0 rgba(0,0,0,0.3)',
        'elevation-2': '0 4px 8px 0 rgba(0,0,0,0.4)',
        'elevation-3': '0 8px 16px 0 rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin':  'spin 1s linear infinite',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  darkMode: 'class',
  corePlugins: {},
}
