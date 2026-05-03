import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Importante que incluya la carpeta app
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#2D1B69",
          mustard: "#D4AF37",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
export default config;