import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeilPass — Private allowlist access",
  description: "Prove you belong without revealing your identity. A Midnight selective disclosure demo.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
