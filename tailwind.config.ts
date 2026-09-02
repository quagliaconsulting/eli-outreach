import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#102033",
          muted: "#3D4F63",
          faint: "#6B7C8F",
        },
        paper: {
          DEFAULT: "#F4EFE6",
          card: "#FFFCF7",
          rule: "#D9D0C3",
        },
        forest: {
          DEFAULT: "#1B6B4A",
          dark: "#124632",
        },
        stamp: {
          DEFAULT: "#B42318",
          soft: "#F8E4E2",
        },
        gold: {
          DEFAULT: "#C9A227",
          soft: "#F6E9C2",
        },
        navy: {
          DEFAULT: "#0B1F33",
          mid: "#16324D",
        },
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        ticket: "0 1px 0 rgba(16,32,51,0.06), 0 12px 32px rgba(16,32,51,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
