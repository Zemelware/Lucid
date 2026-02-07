import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        twilight: {
          950: "#090A19"
        }
      },
      boxShadow: {
        glass: "0 20px 80px rgba(9, 10, 25, 0.5)"
      }
    }
  },
  plugins: []
};

export default config;
