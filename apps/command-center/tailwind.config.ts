import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        caribbean: {
          green: {
            DEFAULT: "#2D5016",
            light: "#3D6B1E",
            dark: "#1E3A0E",
          },
          gold: {
            DEFAULT: "#D4A843",
            light: "#E0BC5E",
            dark: "#B8912A",
          },
          red: {
            DEFAULT: "#C74B2A",
            light: "#D4603F",
            dark: "#A83D20",
          },
          black: {
            DEFAULT: "#1A1A1A",
            light: "#2D2D2D",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
