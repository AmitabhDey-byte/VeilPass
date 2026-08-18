# Route map

| Route | Entry | Layout | What it renders |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | `app/layout.tsx` | VeilPass dashboard with Overview, Access passes, Credentials, Activity, and Host console views. It also contains wallet connect/deploy/proof flows, privacy dialogs, and the assistant drawer. |
| `/api/chat` | `app/api/chat/route.ts` | API route | Gemini-backed privacy assistant with a safe local fallback when no server key is set. |

There is no React Router config: routes use the app-directory file convention.
