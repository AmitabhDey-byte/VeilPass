# Shared layouts

## Root layout

- Source: `app/layout.tsx`
- Description: Global document shell and the application stylesheet entry point.

```tsx
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
```

## Application shell

- Source: `app/page.tsx`
- Description: The existing dashboard shell is local to the single dashboard page: fixed left sidebar, top bar, contextual content pane, floating network toggle, wallet status banners, and assistant drawer. It is not yet a separately exported layout component.

The exact rendered shell is in the `return <div className="app-shell">…</div>` branch of `app/page.tsx`; this source file is passed directly to design generation so the existing layout remains the reproduction ground truth.
