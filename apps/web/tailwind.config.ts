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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.6s ease-out forwards",
        shimmer: "shimmer 1.5s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        spin: "spin 1s linear infinite",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
