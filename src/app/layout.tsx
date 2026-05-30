import type { Metadata } from "next";
import "./globals.css";
import { PartyPanel } from "@/components/PartyPanel";

export const metadata: Metadata = {
  title: "MANGI",
  description: "The ultimate chaotic multiplayer racing combat game.",
  icons: {
    icon: '/branding/mangi-favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen text-mangi-text-primary bg-mangi-bg-primary overflow-x-hidden selection:bg-mangi-orange/30 selection:text-white">
        {children}
        <PartyPanel />
      </body>
    </html>
  );
}
