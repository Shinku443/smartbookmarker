/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        emperor: {
          bg: "var(--emperor-bg)",
          surface: "var(--emperor-surface)",
          surfaceStrong: "var(--emperor-surface-strong)",
          primary: "var(--emperor-primary)",
          primaryStrong: "var(--emperor-primary-strong)",
          text: "var(--emperor-text)",
          muted: "var(--emperor-muted)",
          border: "var(--emperor-border)",
          info: "var(--emperor-info)",
          success: "var(--emperor-success)",
          danger: "var(--emperor-danger)"
        }
      },
      borderRadius: {
        card: "8px",
        pill: "999px"
      },
      keyframes: {
        'emperor-dropdown': {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        'emperor-dropdown': 'emperor-dropdown 120ms ease-out forwards',
      },
    }
  },
  plugins: []
};
