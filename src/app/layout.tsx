import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600", "700"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Lucid",
  description: "ASMR Dreamscape Generator"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${playfair.variable} ${manrope.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
