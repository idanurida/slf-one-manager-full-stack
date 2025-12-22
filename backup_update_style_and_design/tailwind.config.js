/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
  ],

  // PERBAIKAN: Hapus array duplicate
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: {
          DEFAULT: '#7c3aed',
          foreground: 'hsl(var(--primary-foreground))',
          hover: '#6d28d9',
          light: '#8b5cf6',
        },
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Head Consultant Colors
        'consultant-red': '#ef4444',
        'consultant-green': '#10b981',
        'consultant-yellow': '#f59e0b',
        'background-light': '#f8fafc',
        'background-dark': '#0f172a',
        'surface-dark': '#1e293b',
        'surface-light': '#ffffff',
        'card-light': '#ffffff',
        'card-dark': '#1e293b',
      },
      fontFamily: {
        "sans": ["Plus Jakarta Sans", "sans-serif"],
        "display": ["Plus Jakarta Sans", "sans-serif"],
      },
    },
    boxShadow: {
      "soft": "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      "glow": "0 0 15px rgba(124, 58, 237, 0.3)",
      "card": "0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)"
    },
    keyframes: {
      'accordion-down': {
        from: {
          height: '0'
        },
        to: {
          height: 'var(--radix-accordion-content-height)'
        }
      },
      'accordion-up': {
        from: {
          height: 'var(--radix-accordion-content-height)'
        },
        to: {
          height: '0'
        }
      }
    },
    animation: {
      'accordion-down': 'accordion-down 0.2s ease-out',
      'accordion-up': 'accordion-up 0.2s ease-out'
    },
    fontSize: {
      base: ['1rem', { lineHeight: '1.625' }],
      xl: ['1.25rem', { lineHeight: '1.75' }],
      '2xl': ['1.5rem', { lineHeight: '2' }],
      '3xl': ['1.75rem', { lineHeight: '2.125' }],
      '4xl': ['2rem', { lineHeight: '2.25' }],
      '5xl': ['2.25rem', { lineHeight: '1.2' }],
      '6xl': ['2.5rem', { lineHeight: '1.1' }],
      '7xl': ['2.75rem', { lineHeight: '1.1' }],
      '8xl': ['3rem', { lineHeight: '1.1' }],
      '9xl': ['3.25rem', { lineHeight: '1.1' }],
      xs: ['0.75rem', { lineHeight: '1' }],
      sm: ['0.875rem', { lineHeight: '1.25' }],
    }
  },


  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
    require("tailwindcss-animate"),
  ],
};