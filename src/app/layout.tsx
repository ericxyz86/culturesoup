import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CultureSoup — AI Trend Scanner",
  description: "Scan trending AI content and publish to social media",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-[#e0e0e0]`}>
        <ToastProvider>
          <Nav />
          <main className="max-w-[900px] mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="text-center text-[#555] text-xs mt-10 pb-8 border-t border-[#222] pt-5 max-w-[900px] mx-auto px-6">
            <p>CultureSoup v0.1 — AI Trend Scanner &amp; Publisher</p>
            <p>Publishing via Late API &middot; Powered by Agile Intelligence</p>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
