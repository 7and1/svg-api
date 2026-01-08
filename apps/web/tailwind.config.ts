import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        sand: "#f7f2e9",
        mist: "#e7f6ff",
        amber: "#f59e0b",
        teal: "#14b8a6",
        slate: "#64748b",
        surface: "#1a1a2e",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        body: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular"],
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at 20% 20%, rgba(20,184,166,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(245,158,11,0.18), transparent 40%), linear-gradient(120deg, #f7f2e9 0%, #e7f6ff 60%)",
        "hero-gradient-dark":
          "radial-gradient(circle at 20% 20%, rgba(20,184,166,0.15), transparent 40%), radial-gradient(circle at 80% 0%, rgba(245,158,11,0.15), transparent 40%), linear-gradient(120deg, #0f1419 0%, #1a1a2e 100%)",
      },
      boxShadow: {
        glow: "0 10px 40px rgba(20, 184, 166, 0.2)",
        "glow-dark": "0 10px 40px rgba(20, 184, 166, 0.15)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
