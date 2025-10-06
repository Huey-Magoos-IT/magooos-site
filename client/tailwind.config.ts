import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Huey Magoo's Brand Colors
        orange: {
          50: "#FFF5F0",
          100: "#FFE8DB",
          200: "#FFD1B8",
          300: "#FFB894",
          400: "#FF9670",
          500: "#FF6B2C", // Primary brand orange
          600: "#E65A1F",
          700: "#CC4A16",
          800: "#B33B0E",
          900: "#992D07",
        },
        red: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#E63946", // Energy red
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#FFB627", // Warmth gold
          600: "#F59E0B",
          700: "#D97706",
          800: "#B45309",
          900: "#92400E",
        },
        charcoal: {
          50: "#F5F5F5",
          100: "#E5E5E5",
          200: "#CCCCCC",
          300: "#B3B3B3",
          400: "#999999",
          500: "#808080",
          600: "#666666",
          700: "#4D4D4D",
          800: "#333333",
          900: "#1A1A1A", // Sophisticated dark
        },
        cream: {
          50: "#FFFFFF",
          100: "#FFF8F0", // Warm white
          200: "#FFF0E0",
          300: "#FFE8D1",
          400: "#FFE0C2",
          500: "#FFD8B3",
        },
        // Keep some utility colors
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        blue: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        green: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        // Dark mode backgrounds
        "dark-bg": "#0A0A0A",
        "dark-secondary": "#1A1A1A",
        "dark-tertiary": "#2A2A2A",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-orange-red": "linear-gradient(135deg, #FF6B2C 0%, #E63946 100%)",
        "gradient-gold-orange": "linear-gradient(135deg, #FFB627 0%, #FF6B2C 100%)",
        "gradient-cream": "linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 100%)",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in-down": "fadeInDown 0.5s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "shimmer": "shimmer 2.5s infinite",
        "pulse-subtle": "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-subtle": "bounceSubtle 1s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 107, 44, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 107, 44, 0.6)" },
        },
      },
      boxShadow: {
        "glow-orange": "0 0 30px rgba(255, 107, 44, 0.4)",
        "glow-gold": "0 0 30px rgba(255, 182, 39, 0.4)",
        "glow-red": "0 0 30px rgba(230, 57, 70, 0.4)",
        "lift": "0 8px 32px rgba(0, 0, 0, 0.12)",
        "lift-lg": "0 12px 48px rgba(0, 0, 0, 0.18)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "hero": ["clamp(3rem, 8vw, 6rem)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "900" }],
        "display": ["clamp(2rem, 5vw, 3.5rem)", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "800" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
