/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: "#080B10",
          card: "#101622",
          surface: "#182030",
          border: "#232F46",
          accent: "#3B82F6",
          amber: "#F59E0B",
          neon: "#06B6D4",
          red: "#EF4444",
          green: "#10B981"
        }
      }
    },
  },
  plugins: [],
}
