import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIT Sustainability Survey | Your campus, your voice",
  description: "Share your ideas for a more sustainable IIT. IP addresses are encrypted and used to flag possible repeat responses.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
