# Theme inventory

## Compact token summary

- Framework: React 19 rendered through Vinext/Next-style app routes.
- Styling: one global vanilla stylesheet, `app/globals.css`; no Tailwind utility classes or component library.
- Current palette: `--bg #0b0b16`, `--ink #f5f5fa`, `--muted #8b8da1`, `--soft #b9bac9`, `--panel rgba(20,20,37,.75)`, `--line rgba(255,255,255,.08)`, `--purple #9e7cff`, `--cyan #61e3dc`, `--green #77dfad`.
- Typography: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif`; dashboard display headings use roughly 36–61px, section titles 18–19px, body 11–13px, labels 8–10px.
- Existing layout: 238px fixed sidebar; 76px top bar; max content width 1400px; content padding 55px/45px; dashboard grids use 12–32px gaps.
- Existing shape: cards use 10–13px radii, controls use 5–9px radii, modals 17px; shallow border-led depth with large dark translucent shadows.
- Breakpoints: 1050px (host grid stacks), 720px (single-column/mobile adjustments).

## Source of truth

The full raw implementation is `app/globals.css` (153 lines). It is intentionally supplied directly as a context file to every design call, avoiding a stale duplicate in this inventory.
