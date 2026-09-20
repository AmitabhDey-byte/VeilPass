import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeilPass — AI privacy intelligence for Midnight",
  description: "Compile private access policies, minimize disclosure, and prove you belong without revealing your identity.",
  icons: { icon: "/veilpass-bright-icon.png", shortcut: "/veilpass-bright-icon.png", apple: "/veilpass-bright-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
