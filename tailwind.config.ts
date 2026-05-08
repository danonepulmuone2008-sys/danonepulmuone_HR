import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50:  "#f1f9e8",
          100: "#dff2c8",
          200: "#c0e694",
          300: "#97d458",
          400: "#7eca52",
          500: "#72bf44",
          600: "#62a83a",
          700: "#4d8a2d",
          800: "#3d6e24",
          900: "#2f561c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
