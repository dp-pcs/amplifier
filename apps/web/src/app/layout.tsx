import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { auth } from "@/auth";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Amplifier — Content Amplification Platform",
  description: "Transform your Substack content into LinkedIn engagement. Amplify your reach.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div className="text-2xl font-bold" style={{ color: "#8B5CF6" }}>
                Amplifier
              </div>
            </Link>

            <div className="flex items-center gap-6">
              {user && (
                <nav className="flex gap-6 text-sm font-medium" style={{ color: "#64748B" }}>
                  <Link href="/dashboard" className="transition-colors hover:text-slate-900">Dashboard</Link>
                </nav>
              )}

              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#94A3B8" }}>{user.email}</span>
                  <Link
                    href="/api/auth/signout"
                    className="rounded border px-3 py-1 text-xs font-medium transition-colors"
                    style={{ borderColor: "#E2E8F0", color: "#1E293B" }}
                  >
                    Sign Out
                  </Link>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded px-4 py-1.5 text-sm font-semibold text-white transition-colors"
                  style={{ background: "#8B5CF6" }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* ── Main ────────────────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer style={{ borderTop: "1px solid #E2E8F0" }} className="mt-16">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <div className="flex gap-6 text-xs" style={{ color: "#94A3B8" }}>
              <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
            </div>
            <p className="text-xs" style={{ color: "#CBD5E1" }}>
              Amplify your reach
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
