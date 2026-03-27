/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "#f9f9f7",
        "on-surface": "#1a1c1b",
        primary: "#000000",
        "on-primary": "#ffffff",
        "surface-container-low": "#f4f4f2",
        "surface-container-lowest": "#ffffff",
        "surface-container": "#eeeeec",
        secondary: "#5f5e5e",
        "outline-variant": "#c4c7c7",
        "surface-container-high": "#e8e8e6",
        "surface-variant": "#e2e3e1",
      },
      fontFamily: {
        headline: ["Newsreader", "serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Manrope", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
