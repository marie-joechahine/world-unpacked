import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Unpacked — Cinematic Country Discovery",
  description:
    "A premium interactive world map for discovering countries through tactile motion and cinematic flag reveals."
};

export const viewport: Viewport = {
  themeColor: "#030712",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 font-sans text-white antialiased">{children}</body>
    </html>
  );
}
