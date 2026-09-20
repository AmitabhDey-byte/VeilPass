import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeilPass — AI privacy intelligence for Midnight",
  description: "Compile private access policies, minimize disclosure, and prove you belong without revealing your identity.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
