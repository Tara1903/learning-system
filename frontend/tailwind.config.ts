import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./layouts/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#F8FAF8",
          dark: "#0A1F1A",
          primary: "#0F3D2E",
          primaryDark: "#12352B",
          accent: "#D4AF37",
          text: "#1A1A1A",
          textDark: "#EAEAEA",
          border: "#D7E2DA",
          borderDark: "#285042",
          muted: "#E8F0EA",
          mutedDark: "#16342B"
        }
      },
      fontFamily: {
        heading: [
          "var(--font-heading)",
          "serif"
        ],
        body: [
          "var(--font-body)",
          "sans-serif"
        ]
      },
      boxShadow: {
        glow: "0 24px 80px rgba(15, 61, 46, 0.12)",
        card: "0 18px 54px rgba(12, 32, 23, 0.08)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      backgroundImage: {
        "institutional-grid": "radial-gradient(circle at 1px 1px, rgba(15, 61, 46, 0.10) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;

