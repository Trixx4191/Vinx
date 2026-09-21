import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import "./globals.css";

// Google Font: Luxury serif for headings
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-luxury",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Vinx",
  description: "Vinx clothing — soft, considered essentials"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
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
