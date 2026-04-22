/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effef5",
          100: "#d9fce7",
          200: "#b7f7d1",
          300: "#82ecad",
          400: "#4ad97f",
          500: "#1fc85b",
          600: "#13a247",
          700: "#137f3b",
          800: "#146431",
          900: "#14522b",
          950: "#062d17",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(16, 185, 129, 0.08), 0 24px 60px rgba(6, 95, 70, 0.35)",
      },
      fontFamily: {
        sans: ["'Segoe UI Variable Text'", "'Segoe UI'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
