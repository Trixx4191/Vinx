import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinx",
  description: "Vinx clothing — soft, considered essentials"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* Continuous soft background that runs through every page */}
        <div className="bg-layer" aria-hidden />
        <Providers>
          <Navbar />
          <main className="relative mx-auto min-h-[calc(100vh-5rem)] max-w-[1400px] px-5 pb-16 pt-6 sm:px-8 lg:px-12">
            <div className="page-enter">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
