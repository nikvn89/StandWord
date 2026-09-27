import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StandWord — On-chain positions with consequences",
  description: "Record a position, track reliance, and let GenLayer determine whether a later statement narrows its original scope.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
