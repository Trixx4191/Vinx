import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * The one ramp, used site-wide.
         *
         * Warm through the whole range rather than only at the pale end. This
         * has been a true grey (cold, modernist) and a near-grey warm (the mids
         * went muddy); it is now a sand ramp with the same hue held from 50 to
         * 800, which is what makes the tones look like one family instead of
         * four decisions.
         *
         * Why warm at all: the reference storefront shoots on sand and sits on
         * sand, because a warm ground flatters skin and knitwear. On a cold grey
         * both look grey too, and this catalog is mostly both.
         *
         * 700 is the primary action colour and 800 the text colour — neither is
         * pure black, which against a bone ground reads as a hole punched in the
         * page. 900 stays available for the rare place that wants true black.
         *
         * Token names are unchanged, so nothing consuming them breaks.
         */
        soft: {
          50: "#faf8f6",
          100: "#f3efea",
          200: "#e8e1d9",
          300: "#d7cdc1",
          400: "#ab9e8f",
          500: "#7d7267",
          600: "#4e463e",
          700: "#262220",
          800: "#16130f",
          900: "#000000"
        },

        /**
         * Accents, and there are deliberately few.
         *
         * All three are muted into the same warm world as the ramp. The
         * saturated originals (#D4AF37 brass, #8B3A3A, a mint #ACE5E0) were
         * picked against a cold grey page and read as decoration on a bone one —
         * on a storefront the only colour that should raise its voice is the
         * product.
         *
         * These carry meaning, which is why they survive at all: `clay` marks an
         * accent badge, `gold` a low-stock warning, and the two `vienna` tones
         * success and failure. Nothing here is used ornamentally.
         */
        clay: "#b98b6e",
        gold: "#a8822c",
        "vienna-green": "#5f7a5c",
        "vienna-red": "#9c3b2f"

        // Removed: a `gray` ramp that shadowed Tailwind's own with near-identical
        // cold values, and `rose`/`celadon` accents nothing referenced. A second
        // neutral ramp beside `soft` is how a palette stops being one — half the
        // app ends up cold and nobody can say why.
      },
      fontFamily: {
        /**
         * One family for the whole site, fed by the next/font variable set in
         * layout.tsx.
         *
         * Archivo rather than Inter. Inter is an excellent interface face and
         * that is the problem: it is the most-used font on the web and reads as
         * software, so a fashion storefront set in it looks like a dashboard
         * selling clothes. Archivo is a grotesque in the Helvetica/Univers
         * lineage — the same anonymous-modernist register the reference uses —
         * with enough presence at display sizes to carry a headline and enough
         * restraint to set a size chart.
         *
         * One variable file, latin subset. A display/text pairing was the
         * alternative and was rejected on weight: a second family is a second
         * download for every shopper, and plenty of this audience is on mobile
         * data. The contrast comes from tracking instead, which is free.
         */
        sans: [
          "var(--font-grotesque)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      // NOTE: Tailwind's default `spacing` and `fontSize` scales are left
      // untouched on purpose. Redefining keys like `4` or `sm` there rewrites
      // every existing `p-4` / `text-sm` in the app at once — this has bitten
      // once already, doubling every padding in the app. The look comes from the
      // component layer and the tokens in globals.css, never from silently
      // resizing Tailwind's scale.
      maxWidth: {
        container: "1600px",
        // Measure for running copy. Beyond about 68 characters a line gets hard
        // to track back from, and an editorial paragraph is the one place this
        // site sets more than a sentence.
        copy: "34rem"
      },
      // No `borderRadius` overrides. The 2xl/3xl/4xl steps defined here were
      // never drawn — a rule in globals.css flattened all of them to 0 — so they
      // existed only to let components claim a radius they did not get. The
      // system is square; `rounded-full`, which Tailwind provides, covers the
      // few things that are genuinely circular.
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-out": "cubic-bezier(0.16, 1, 0.3, 1)"
      },
      transitionDuration: {
        // The house duration for anything that moves on hover. Long and eased
        // out; the point of naming it is that every surface uses the same one.
        700: "700ms"
      }

      // Removed: `boxShadow` (glass/soft/soft-lg/card), `backdropBlur.glass`,
      // and the `animation`/`keyframes` blocks.
      //
      // The shadows and blur had zero references — the system went flat and
      // square some time ago and they were left behind. The animations had zero
      // references too, and that was worse than dead code: `.page-enter` in
      // globals.css animates `slideUp`, but Tailwind only emits a `@keyframes`
      // block when the matching `animate-*` utility is found in the source. With
      // none, the keyframes were never emitted and every page's entry animation
      // silently did nothing. Both keyframe sets are now declared directly in
      // globals.css, where the classes that use them live.
    }
  },
  plugins: []
};

export default config;
