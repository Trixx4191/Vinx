import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import "./globals.css";

/**
 * One grotesque for the whole site.
 *
 * Archivo, not Inter. Inter is an excellent interface typeface and that is
 * exactly the problem — it is the most-used font on the web and reads as
 * software, so a storefront set in it looks like a dashboard that happens to
 * sell clothes. Archivo sits in the Helvetica/Univers grotesque lineage, which
 * is the anonymous-modernist register this brand is aiming at: enough presence
 * at display sizes to carry a headline, enough restraint to set a size chart.
 *
 * A display/text pairing was the alternative and was rejected on page weight. A
 * second family is a second download for every shopper, and a good share of
 * this audience is on mobile data in Ghana. Loading one variable font and
 * getting the contrast from tracking instead costs nothing.
 *
 * `axes: ["wdth"]` is deliberately absent: Archivo ships a width axis, and
 * including it roughly doubles the file for a variation nothing here uses.
 */
const archivo = Archivo({
  subsets: ["latin"],
  // A range, not a list: this is a variable font, so the browser gets one file
  // covering everything from body copy to the wordmark.
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesque",
  // `swap`, so text paints immediately in the fallback and reflows when the
  // font lands. On a slow connection the alternative is a headline that is
  // invisible for two seconds.
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "Vinx",
    // Every other page sets its own title and gets the brand appended, rather
    // than each one remembering to add it.
    template: "%s — Vinx"
  },
  description: "Vinx — considered essentials, made for the in-between. Shipping from Accra."
};

/**
 * `themeColor` belongs here, not in `metadata`. Next moved it in 14 and warns
 * on every build if it is left in the metadata export.
 *
 * It paints the mobile address bar in the page's own ground instead of a browser
 * default, which otherwise cuts a grey band across the top of a bone-coloured
 * site.
 */
export const viewport: Viewport = {
  themeColor: "#faf8f6"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen antialiased">
        <div className="bg-layer" aria-hidden />
        <Providers>
          {/* Skip link. The header carries an announcement bar, a wordmark, four
              category links and two icon buttons before the page content
              starts — that is a long way to tab past on every single page. */}
          <a
            href="#main"
            className="type-micro sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-soft-800 focus:px-4 focus:py-3 focus:text-soft-50"
          >
            Skip to content
          </a>

          <Navbar />

          {/* `flex-col` with the footer outside: the shell no longer forces a
              min-height on main, because a short page (an empty cart, a 404)
              was being padded to full viewport height and pushing the footer off
              the fold for no reason. The body handles the full height instead. */}
          <main
            id="main"
            className="relative mx-auto w-full max-w-container px-5 pb-24 pt-6 sm:px-8 lg:px-10"
          >
            <div className="page-enter">{children}</div>
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}
