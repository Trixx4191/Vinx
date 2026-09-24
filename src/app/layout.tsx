import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import "./globals.css";

/**
 * One neo-grotesque for the whole site.
 *
 * This replaces the Playfair Display serif used earlier. A serif reads as
 * heritage luxury — Dior, Tiffany — while Prada's house style is the opposite:
 * a tight modernist sans, set in near-black on white, with headlines pulled in
 * on their tracking and labels pushed far out. The contrast between those two
 * treatments of the same typeface is what carries the look, so a second family
 * would only dilute it.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-grotesque",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Vinx",
  description: "Vinx clothing — soft, considered essentials"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <div className="bg-layer" aria-hidden />
        <Providers>
          <Navbar />
          <main className="relative mx-auto min-h-[calc(100vh-5rem)] max-w-[1600px] px-5 pb-16 pt-6 sm:px-8 lg:px-10">
            <div className="page-enter">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
