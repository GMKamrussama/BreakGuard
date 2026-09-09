/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#070b14",
        card: "#0f172a",
        border: "#1e293b",
      },
    },
  },
  plugins: [],
};
