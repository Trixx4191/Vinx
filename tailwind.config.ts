import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The primary ramp, used site-wide. Every step is a true neutral:
        // the previous values carried a green cast (#f2f2f0, #858582, #3d3d3a)
        // which reads warm and artisanal. A modernist luxury palette has no
        // temperature at all, so the only colour on the page is the product.
        // The token names are unchanged, so nothing that consumes them breaks.
        soft: {
          50: "#fafafa",
          100: "#f4f4f4",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#404040",
          700: "#171717",
          800: "#0a0a0a",
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
        // The single family for the whole site, fed by the next/font variable
        // set in layout.tsx. The `luxury` and `serif` keys that used to live
        // here pointed at Playfair Display, which is no longer loaded — leaving
        // them would have meant `font-serif` silently rendering in whatever
        // system serif happened to exist, which is exactly the kind of drift
        // that makes a design system stop being one.
        sans: [
          "var(--font-grotesque)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      // NOTE: Tailwind's default `spacing` and `fontSize` scales are left
      // untouched on purpose. Redefining keys like `4` or `sm` there rewrites
      // every existing `p-4` / `text-sm` in the app at once — the luxury look
      // comes from the component layer, not from silently resizing the scale.
      maxWidth: {
        container: "1400px"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem"
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)",
        soft: "0 4px 24px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 12px 40px rgba(0, 0, 0, 0.06)",
        card: "0 2px 12px rgba(0, 0, 0, 0.04)"
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
