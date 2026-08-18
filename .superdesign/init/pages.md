# Page dependency trees

## / (VeilPass dashboard)

Entry: `app/page.tsx`

Dependencies:

- `app/page.tsx`
  - React client hooks (`useEffect`, `useMemo`, `useRef`, `useState`)
  - `@midnight-ntwrk/dapp-connector-api` types
  - dynamically loads `lib/midnight-browser-deploy.ts` for real Preview deployment/proof execution
    - `lib/browser-polyfills.ts`
  - calls `/api/chat` for the optional Veil assistant
  - styled by `app/globals.css`
  - document wrapper: `app/layout.tsx`

Rendered view branches inside the page:

1. Overview: proof launch card, activity table, privacy/contract card.
2. Access passes: available private allowlists and the proof launch flow.
3. Credentials: locally represented shielded credentials and import dialog.
4. Activity: filtered public ledger events.
5. Host console: allowlist-root registration and deployment guidance.

## /api/chat

Entry: `app/api/chat/route.ts`

Dependencies:

- Route-local fallback answers
- Server-only `GEMINI_API_KEY` or `GOOGLE_API_KEY` (optional)
- Gemini REST API when a key exists
