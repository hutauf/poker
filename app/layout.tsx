import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokerlabor – Texas Hold’em entdecken",
  description: "Karten wählen, Chancen entdecken: interaktiver Texas-Hold’em-Chancenrechner für 2–10 Spieler.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
