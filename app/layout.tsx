"use client";
import type { Metadata } from "next";
import "./globals.css";
import { Lily_Script_One, Hachi_Maru_Pop, Gorditas } from "next/font/google";

import { useEffect } from "react";

const lily = Lily_Script_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-title",
});

const hachi = Hachi_Maru_Pop({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-body",
});

const gorditas = Gorditas({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-extra",
});

export const metadata: Metadata = {
  title: "Elysium Bot Dashboard",
  description: "Manage your Discord server settings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return (
    <html lang="en">
      <body className={`${lily.variable} ${hachi.variable} ${gorditas.variable}`}>{children}</body>
    </html>
  );
}
