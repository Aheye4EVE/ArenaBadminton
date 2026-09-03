import type { Metadata } from "next";
import { Fredoka, Mitr } from "next/font/google";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-fredoka",
});

const mitr = Mitr({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mitr",
});

export const metadata: Metadata = {
  title: "Arena-Badminton",
  description: "หาก๊วนง่าย นัดตีสะดวก เพื่อนใหม่เพียบ",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" data-scroll-behavior="smooth" className={`${fredoka.variable} ${mitr.variable}`}>
      <body>{children}</body>
    </html>
  );
}
