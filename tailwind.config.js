/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./core/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./plugins/**/*.{js,ts,jsx,tsx}",
    "./ui/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
        pixel: ['"Press Start 2P"', "cursive"],
        game: ["Cinzel", "serif"],
      },
      colors: {
        accent: "#6366f1", // Indigo 500
      },
    },
  },
  plugins: [],
};
