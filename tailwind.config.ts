import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // EXISTING: Soft palette (keep as-is for compatibility)
        soft: {
          50: "#fafafa",
          100: "#f2f2f0",
          200: "#e5e5e2",
          300: "#d1d1ce",
          400: "#858582",
          500: "#5f5f5c",
          600: "#3d3d3a",
          700: "#111111",
          800: "#080808",
          900: "#000000"
        },
        // NEW: Luxury grays (extends soft palette for luxury aesthetic)
        gray: {
          50: "#FAFAFA",
          100: "#F3F3F3",
          200: "#E8E8E8",
          300: "#D3D3D3",
          400: "#A8A8A8",
          500: "#808080",
          600: "#4D4D4D",
          700: "#333333",
          800: "#1A1A1A",
          900: "#0D0D0D"
        },
        // NEW: Luxury accent colors (collection-specific)
        celadon: "#ACE5E0",
        "vienna-green": "#6B8E6F",
        "vienna-red": "#8B3A3A",
        gold: "#D4AF37",
        rose: "#E8A7A7"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        // NEW: Luxury serif for headings
        luxury: ['"Playfair Display"', '"Garamond"', '"Georgia"', 'serif'],
        serif: ['"Playfair Display"', '"Garamond"', 'serif']
      },
      fontSize: {
        // NEW: Luxury type scale with headings
        "h1": ["3.5rem", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "h2": ["2.8rem", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.01em" }],
        "h3": ["2.2rem", { lineHeight: "1.3", fontWeight: "600" }],
        "h4": ["1.8rem", { lineHeight: "1.4", fontWeight: "500" }],
        "h5": ["1.4rem", { lineHeight: "1.5", fontWeight: "600" }],
        "h6": ["1.2rem", { lineHeight: "1.6", fontWeight: "600" }],
        "body-lg": ["1.1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-xs": ["0.75rem", { lineHeight: "1.5", fontWeight: "400" }],
        "label": ["0.75rem", { lineHeight: "1.5", fontWeight: "500", letterSpacing: "0.08em", textTransform: "uppercase" }],
        "caption": ["0.7rem", { lineHeight: "1.4", fontWeight: "400", letterSpacing: "0.05em", textTransform: "uppercase" }]
      },
      letterSpacing: {
        luxury: "0.02em"
      },
      spacing: {
        // NEW: 8px base unit spacing
        1: "0.5rem",
        2: "1rem",
        3: "1.5rem",
        4: "2rem",
        5: "2.5rem",
        6: "3rem",
        7: "4rem",
        8: "5rem",
        9: "6rem",
        10: "8rem"
      },
      maxWidth: {
        container: "1400px"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        // NEW: Luxury sharp corners (border-radius: 0)
        none: "0px"
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)",
        soft: "0 4px 24px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 12px 40px rgba(0, 0, 0, 0.06)",
        card: "0 2px 12px rgba(0, 0, 0, 0.04)",
        // NEW: Minimal luxury shadows
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      },
      backdropBlur: {
        glass: "20px"
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-out": "cubic-bezier(0.16, 1, 0.3, 1)"
      },
      animation: {
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        // NEW: Skeleton loading animation
        "skeleton-loading": "skeleton-loading 1.5s infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        // NEW: Skeleton shimmer
        "skeleton-loading": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      }
    }
  },
  plugins: []
};

export default config;
