import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * Neutral. The storefront is black, white and one grey (500); the rest
         * of the ramp exists for the admin, whose panels and tables need the
         * in-between steps. An earlier warm sand ramp suited an editorial
         * storefront this no longer is — beside pure black and white, warm
         * greys read as dirty.
         *
         * Token names are unchanged, so nothing consuming them breaks.
         */
        soft: {
          50: "#ffffff",
          100: "#f6f6f6",
          200: "#ececec",
          300: "#d6d6d6",
          400: "#a3a3a3",
          500: "#8a8a8a",
          600: "#4d4d4d",
          700: "#1a1a1a",
          800: "#0a0a0a",
          900: "#000000"
        },

        /**
         * Meaningful colour only, and almost none of it reaches the storefront:
         * `vienna-red` marks errors there, and nothing else is coloured. The
         * others are admin status marks — `gold` for low stock, `vienna-green`
         * for success. `clay` is kept as a grey so the one Badge variant that
         * references it does not break.
         */
        clay: "#8a8a8a",
        gold: "#a8822c",
        "vienna-green": "#4f6b4c",
        "vienna-red": "#b3261e"
      },
      fontFamily: {
        // The storefront's only face: a monospace, one variable file, set in
        // layout.tsx.
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
        // The admin's face, loaded only by the admin layout, so the storefront
        // never downloads it.
        sans: ["var(--font-grotesque)", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"]
      },
      // Tailwind's default `spacing` and `fontSize` scales are never redefined.
      // Overriding a key like `4` or `sm` rewrites every `p-4` / `text-sm` in the
      // app at once — this has bitten once already. The look lives in the tokens
      // in globals.css.
      maxWidth: {
        container: "1800px",
        // Measure for the few paragraphs the site sets. Monospace runs wide, so
        // this is narrower than it would be for a proportional face.
        copy: "30rem"
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-out": "cubic-bezier(0.16, 1, 0.3, 1)"
      },
      transitionDuration: {
        700: "700ms"
      }
      // Deliberately absent: `borderRadius` (the system is square; Tailwind's
      // own `rounded-full` covers the few genuinely circular things), and
      // `animation`/`keyframes` (Tailwind only emits keyframes when a matching
      // `animate-*` utility appears in the source, so they live in globals.css
      // beside the classes that use them).
    }
  },
  plugins: []
};

export default config;
