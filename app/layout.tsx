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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#e8f7fb] font-sans text-[#12323f] antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
