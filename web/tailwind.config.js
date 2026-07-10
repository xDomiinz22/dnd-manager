/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#2A1B12",
          muted: "#6B5640",
        },
        parchment: {
          DEFAULT: "#F0E4C8",
          panel: "#E4D3A6",
          deep: "#D8C08A",
        },
        oxblood: {
          light: "#8B2430",
          DEFAULT: "#6B1620",
          dark: "#4A0F16",
        },
        gold: {
          DEFAULT: "#A8792B",
          bright: "#C99A3E",
        },
        rule: {
          DEFAULT: "#C4AF7C",
          strong: "#6B5640",
        },
        moss: {
          DEFAULT: "#3B5323",
        },
      },
      fontFamily: {
        display: ['"Cinzel"', "serif"],
        body: ['"EB Garamond"', "serif"],
      },
    },
  },
  plugins: [],
};
