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
            DEFAULT: "#006633",
            light: "#00884D",
            dark: "#004D26",
          },
          gold: {
            DEFAULT: "#D4AF37",
            light: "#E5C158",
            dark: "#B8941F",
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
