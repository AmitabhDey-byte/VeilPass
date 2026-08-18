# Extractable component candidates

## VeilPassAppShell

- Source: `app/page.tsx`
- Category: layout
- Description: Fixed sidebar, top bar, contextual page region, status banners, network switcher, and assistant entry point.
- Extractable props: `activeView`, `onViewChange`, `selectedNetwork`, `onNetworkChange`, `connected`, `walletAddress`, `onConnectWallet`, `onOpenAssistant`.
- Hardcoded: VeilPass mark, workspace labels, Midnight documentation link, sidebar navigation labels, status copy, CSS classes.

## SectionHeading

- Source: `app/page.tsx`
- Category: basic
- Description: Repeated section kicker/title/action composition.
- Extractable props: `kicker`, `title`, `action`.
- Hardcoded: semantic wrapper and CSS class names.

## PrivacyCard

- Source: `app/page.tsx`
- Category: basic
- Description: Public/private disclosure explanation with a deployment summary.
- Extractable props: `contractAddress`, `selectedNetwork`, `deploymentBusy`, `onOpen`, `onCopy`, `onDeploy`.
- Hardcoded: three public/private field labels and standard privacy explanation.

## ActivityTable

- Source: `app/page.tsx`
- Category: basic
- Description: Reusable ledger event table.
- Extractable props: `rows`, `highlight`.
- Hardcoded: four table column headings and status visual rules.

No component is currently extracted into a standalone source file, so design generation will keep these patterns inline rather than inventing a premature component abstraction.
