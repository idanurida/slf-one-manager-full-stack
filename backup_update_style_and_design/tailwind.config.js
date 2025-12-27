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
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "#7c3aed",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Design Standard Extensions
        "background-light": "#f9f9fb",
        "background-dark": "#020617",
        "surface-light": "#ffffff",
        "surface-dark": "#0f172a",
        "text-secondary-light": "#6b7280",
        "text-secondary-dark": "#9ca3af",
        "status-yellow": "#f59e0b",
        "status-green": "#10b981",
        "consultant-red": "#ef4444",
        "consultant-green": "#10b981",
        "consultant-yellow": "#f59e0b",
      },

      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
        "sans": ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        "none": "0",
        "sm": "0.125rem",
        "DEFAULT": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px",
      }
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
