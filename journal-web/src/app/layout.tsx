import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Book, Home, Settings } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Simple Journal",
  description: "A private, focused space for mindfulness and creativity.",
  manifest: "/manifest.ts",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-[--border-soft] bg-[--surface]/80 backdrop-blur-sm px-4 md:px-6">
            <nav className="hidden w-full flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-semibold md:text-base"
              >
                <Book className="h-6 w-6 text-[--accent]" />
                <span className="sr-only">Simple Journal</span>
              </Link>
              <Link
                href="/"
                className="text-[--muted] transition-colors hover:text-[--foreground]"
              >
                Home
              </Link>
              <Link
                href="/entries"
                className="text-[--muted] transition-colors hover:text-[--foreground]"
              >
                All Entries
              </Link>
            </nav>
            <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
              <Link href="/settings">
                <Settings className="h-6 w-6 text-[--muted] transition-colors hover:text-[--foreground]" />
                <span className="sr-only">Settings</span>
              </Link>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}