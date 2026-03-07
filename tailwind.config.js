/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d6fe",
          300: "#a5bafd",
          400: "#8093fa",
          500: "#6066f4",
          600: "#4b49e8",
          700: "#3d3bcc",
          800: "#3232a5",
          900: "#1e2060",
          950: "#131440",
        },
        gold: {
          50: "#fefbec",
          100: "#fdf3c9",
          200: "#fae489",
          300: "#f7cf4d",
          400: "#f4bb24",
          500: "#e39f0f",
          600: "#c97b09",
          700: "#a1590b",
          800: "#844511",
          900: "#703913",
          950: "#401c05",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        risk: {
          high: "#ef4444",
          medium: "#f59e0b",
          low: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
        mono: ["monospace"],
      },
      backgroundImage: {
        "gradient-navy": "linear-gradient(135deg, #1e2060 0%, #3232a5 100%)",
        "gradient-gold": "linear-gradient(135deg, #e39f0f 0%, #f7cf4d 100%)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        sidebar: "1px 0 10px rgba(0,0,0,0.05)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        typing: "typing 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        typing: {
          "0%, 60%, 100%": { opacity: "0.4" },
          "30%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

module.exports = config;
