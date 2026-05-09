import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--surface-muted) / <alpha-value>)",
        foreground: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-fg) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-fg) / <alpha-value>)",
          soft: "rgb(var(--primary-soft) / <alpha-value>)"
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-fg) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)"
        },
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        // legacy splyt token kept so unmigrated screens don't break
        splyt: {
          indigo: "#6366F1",
          dim: "#4F46E5",
          zinc: "#18181B"
        }
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "600" }],
        "display-lg": ["clamp(2.25rem, 4.5vw, 3.25rem)", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" }]
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px"
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15, 17, 21, 0.04)",
        sm: "0 2px 6px rgba(15, 17, 21, 0.05)",
        md: "0 6px 18px -4px rgba(15, 17, 21, 0.08)",
        lg: "0 18px 40px -12px rgba(15, 17, 21, 0.12)",
        ring: "0 0 0 4px rgb(var(--ring) / 0.25)"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.4s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
