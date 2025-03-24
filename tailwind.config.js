/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a1a1a",        // Background color
        secondary: "#232323",      // Sidebar/header color
        accent: "#ff0000",         // YouTube red accent
        "text-primary": "#ffffff", // Main text color
        "text-secondary": "#aaaaaa", // Secondary text color
        hover: "#383838",          // Hover background color
      },
      height: {
        'header': '60px',
      },
      width: {
        'sidebar': '240px',
      },
      boxShadow: {
        'header': '0 2px 10px rgba(0, 0, 0, 0.3)',
        'card': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 15px rgba(0, 0, 0, 0.2)',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(120%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        pulse: 'pulse 2s infinite',
        slideIn: 'slideIn 0.3s ease-out forwards',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}