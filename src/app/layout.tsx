import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GitHub Star Aggregator",
  description:
    "Aggregate stars from your GitHub repos and display a live-updating badge on your profile README.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased bg-black text-white min-h-screen`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
