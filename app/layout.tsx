import type { Metadata } from "next";
import "./globals.css";
import { Lily_Script_One } from "next/font/google";

const lily = Lily_Script_One({
  subsets: ["latin"],
  weight: "400",
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
  return (
    <html lang="en">
      <body className={lily.className}>{children}</body>
    </html>
  );
}
