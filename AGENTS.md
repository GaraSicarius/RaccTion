# Agent notes

## Commands

```bash
# Node 24 lives at C:\Program Files\nodejs and is NOT on PATH — prepend it first:
export PATH="/c/Program Files/nodejs:$PATH"

npm run build   # tsc -b && vite build && vite build -c vite.content.config.ts
npm test        # node --test tests/*.test.mjs
npm run demo    # vite serves demo-pages/ on 127.0.0.1 (port 5174, or next free)
```

- Dependencies use **pnpm** (`pnpm-lock.yaml`, `.pnpm` layout). Install via `corepack pnpm install`; add dev deps with `corepack pnpm add -D <pkg>@<version published ≥7 days ago>` — do not touch `.npmrc` / `minimumReleaseAge`.
- Build the extension → load `dist/` unpacked at `chrome://extensions` / `edge://extensions` / `opera://extensions`.

## Layout

- `src/lib/` and `src/ai/` are pure TypeScript modules imported directly by `node --test` (Node 24 type stripping). They **must** use relative imports with explicit `.ts` extensions, and must not use enums, parameter properties, or the `@/` alias — Node can't resolve them.
- `src/components/ResultCard.tsx` is shared by the overlay (`src/overlay`), Admin live preview and History modal — it has a `readOnly` prop that disables actions.
- `src/lib/sample.ts` is the single-sourced demo `PageCapture` used by tests (`tests/*.test.mjs`) and the Admin live preview.
- `src/content/` builds as a standalone IIFE (`content.js`, no imports, no React). `src/background/` builds as an ES module service worker (`background.js`).
- Category icon map lives in `src/components/icons.ts` (keyed by `CategoryDef.icon`).

## Gotchas

- Opera GX is Chromium 136 → `minimum_chrome_version` must stay ≤136 (currently `"120"`). Opera/Edge have no `LanguageModel`; keyword-only mode is the expected path there.
- Restricted-page check (background + popup regexes) covers `chrome:`, `edge:`, `opera:`, web stores, and `file:` without access.
- Gemini Nano download can only start from a user gesture on an extension page (Admin), never from the service worker.
