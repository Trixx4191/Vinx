import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsletterPopup from "@/components/NewsletterPopup";
import Providers from "@/components/Providers";
import "./globals.css";

/**
 * The storefront's one typeface: a monospace, at essentially one size, in
 * capitals.
 *
 * A monospace does something a proportional grotesque cannot at this level of
 * reduction: every label has the same texture, so a product code, a price and a
 * nav item all read as parts of one system rather than as a hierarchy. It is
 * what lets the page carry no headlines at all without feeling unfinished.
 *
 * Geist Mono is variable — one file for every weight — and neutral enough to
 * stay out of the photographs' way. The admin loads its own proportional face
 * in its own layout, so the storefront never pays for it.
 */
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  // Text paints immediately in the system monospace and reflows when this
  // lands; the alternative on a slow connection is an invisible page.
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "Vinx",
    template: "%s — Vinx"
  },
  description: "Vinx. Essentials, made in Accra."
};

// In `viewport`, not `metadata` — Next warns on every build otherwise. Paints
// the mobile browser chrome the page's own white.
export const viewport: Viewport = {
  themeColor: "#ffffff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-screen">
        <Providers>
          <a
            href="#main"
            className="type-label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-black focus:px-4 focus:py-3 focus:text-white"
          >
            Skip to content
          </a>

          <Navbar />

          <main id="main" className="relative mx-auto w-full max-w-container px-[var(--gutter)] pb-32">
            <div className="page-enter">{children}</div>
          </main>

          <Footer />
          <NewsletterPopup />
        </Providers>
      </body>
    </html>
  );
}
