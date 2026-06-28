import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: "#FFFFFF",
        paper: "#FAFAF9",
        ink: "#121212",
        graphite: "#767472",
        line: "#E7E5E2",
        sale: "#8A1C1C",
        gold: "#9A7B4F"
      },
      fontFamily: {
        display: ["var(--font-display)", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      letterSpacing: {
        luxe: "0.22em",
        wide2: "0.14em"
      },
      borderRadius: {
        none: "0px"
      }
    }
  },
  plugins: []
};
export default config;
