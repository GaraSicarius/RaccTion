# RaccTion disclosures

## Models and inference

- **Gemini Nano**, via Chrome's built-in **Prompt API** (`globalThis.LanguageModel`), runs entirely on the device. The model is downloaded and managed by Chrome — it is not bundled with the extension — and the exact model version can be inspected at `chrome://on-device-internals`.
- Output is constrained to a small JSON schema (`responseConstraint`) and treated as data only; every AI quote is validated against the captured page text before it earns a "Required" label or a trust point.
- When the Prompt API is missing or the model isn't available, RaccTion runs in **keyword-only mode** and says so on the card.
- **Real-inference verification on the demo machine: pending.**

## Technologies and frameworks

From `package.json` at submission time:

- React 19 / ReactDOM 19, Vite 8, TypeScript 5.9, Tailwind CSS 4 (@tailwindcss/vite), Framer Motion 12, lucide-react 1.53, clsx 2, tailwind-merge 3, @fontsource DM Sans 5 / Fraunces 5, @types/chrome 0.3, @types/node 22.
- Chrome Extension APIs: `scripting` (on-demand injection), `storage` (settings/history in `storage.local`, live scan state in `storage.session`), `action` (badge), `runtime` (messages, options page), `tabs` (capture/highlight messaging).
- Web platform: CSS Custom Highlight API (`::highlight(racction-hit)` + `CSS.highlights`) for "Show on page"; Web Crypto PBKDF2-SHA256 (150,000 iterations, 16-byte salt) for the optional Admin PIN; `structuredClone`, `AbortController` timeouts, `promptStreaming`.

## APIs and cloud services

**None.** There is no backend, no analytics, no API key, no account. The only network fetch the extension itself ever triggers is Chrome's one-time Gemini Nano model download. Scanned page content never leaves the device.

## Existing code and assets

- The **RaccTion interface preview** was built earlier on 9 October 2026 during the same hackathon: design tokens, the raccoon SVG mark, and the Alert component (adapted from a user-supplied Framer Motion component whose original source URL and license remain unverified).
- `public/art/cave-background.jpg` — user-supplied artwork (source ZIP with EPS/JPG; creator/license/attribution rights unverified). Used on the Admin page hero.
- `public/icons/icon-*.png` — rendered from the raccoon SVG on a forest tile for this project.
- `demo-pages/` — synthetic promo pages written for this project; each is labeled "Synthetic demo page for RaccTion — not a real offer".
- `references/` — original supplied files (EPS artwork, briefing PDF, supplied component text) kept for provenance; not shipped in `dist/`.

## AI development tools

- **Devin (Cognition)** — planning, implementation, and testing of the Chrome extension (this delivery).
- The earlier interface preview used **OpenAI Codex** with **Impeccable** design guidance and an installed 21st CLI skill for component integration. These tools are separate from product inference; no paid 21st asset was retrieved.

## User data

- Settings and scan history live in `chrome.storage.local` on the device; in-flight scan state lives in `chrome.storage.session`.
- The optional Admin PIN is stored only as a salted PBKDF2 hash (`adminPin`) — the export never contains it — and the unlock flag lives in session storage until the browser restarts.
- The **autofill profile** (all-optional name/email/mobile/address/postal/birthdate) lives in `chrome.storage.session` key `profile` and is cleared when the browser closes. With an Admin PIN, an optional "Remember on this device" copy is stored as `profileEnc` — AES-GCM-256, key derived via PBKDF2-SHA256 (150,000 iterations, separate salt), random IV. Profile values never enter prompts, scan results, history, exports, badge text or logs, and are never sent anywhere except into the page fields the user explicitly approves. Passwords, card/OTP/PIN, bank/ID numbers, uploads and consent checkboxes are never stored or filled, and RaccTion never submits forms.
- Export (`racction-export-*.json`) contains settings + history only — never `profile` or `profileEnc`.
