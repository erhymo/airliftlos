import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AccessGuard } from "../components/AccessGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Airlift LOS-rapporter",
	description:
		"Vaktrapport, driftsforstyrrelser og LOS-rapporter for loshelikopter-operasjoner i Bergen og Hammerfest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
	      <body
	        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
	      >
	        <AccessGuard>{children}</AccessGuard>
	      </body>
    </html>
  );
}
