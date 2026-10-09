# Verification — 10 October 2026

Scope: the working MV3 extension build (`dist/`), checked on this laptop. Keyword-only mode verified end-to-end in a real browser; real Gemini Nano inference remains pending on a capable machine.

## Automated checks

- `node --test tests/*.test.mjs` — **23/23 pass** (~1.3 s). Covers: all four demo scenarios (prize/trial/coffee/free-plan effort + trust), negation filtering ("No credit card required" → card_details not found; later non-negated hit still found), AI downgrade of `mentioned` findings, quote validation/normalization, threshold boundaries, blocked/trusted domains incl. subdomains, settings merge + import validation, prompt budget/injection fencing, PIN hash/verify, and service-worker orchestration smoke tests.
- `pnpm build` — clean: `tsc -b` + `vite build` + `vite build -c vite.content.config.ts`. `dist/` contains `manifest.json` (`minimum_chrome_version: "120"`), `background.js` (ES module SW), `content.js` (**single IIFE, zero import statements**), `popup.html`, `admin.html`, `overlay.html`, `icons/icon-{16,32,48,128}.png`, `art/cave-background.jpg`, hashed assets.

## Browser checks performed

- **Edge 155 headless** (`--load-extension=dist`): extension loaded with no manifest errors; the service worker ran `onInstalled` → opened `admin.html`. Popup, overlay and admin pages render. Screenshots: `admin-display.png` (live preview showing the ResultCard, effort `Hard`, trust `High risk` computed live via ruleScan+mergeFindings+buildResult on the shared sample), `admin-model.png` (model status chip: "Prompt API not found — this browser can't run Gemini Nano"), `popup.png`.
- **Opera GX 136 headless** (keyword-only path, real end-to-end): loaded a copy of `dist/` with a temporary `host_permissions` patch for `http://127.0.0.1/*` (simulating the `activeTab` user gesture — the shipped manifest is unchanged). Real scan of `demo-pages/prize.html` driven via `chrome.runtime.sendMessage({type:'scan'})` from the admin page:
  - `content.js` injected → page captured → rules → scoring → `stage: done`
  - Result: **effort hard (14), trust high (9 pts)**; signals `otp_pin, time_pressure, prize_with_payment, brand_mismatch`; findings incl. `card_details:asked_in_form`, `otp_pin:asked_in_form`, `mobile_number:asked_in_form`; `aiUsed:false`, `aiNote: "Gemini Nano isn't available on this device — keyword scan only."`; history saved.
  - The overlay iframe (`overlay.html?tab=…`) rendered the ResultCard **inside the live page** — screenshot `opera-scan-result.png`.
  - Opera Admin renders with status "Not supported on this device — keyword scan only" — screenshot `opera-admin.png`.
  - **Bug found & fixed during verification**: Opera exposes `globalThis.LanguageModel` but `availability()` never settles, which previously stalled scans at the `rules` stage forever. `getAvailability()` now races a 3 s timeout → `unavailable`; the abort signal is forwarded to `LanguageModel.create()`; and the background races `analyze()` against the 90 s timeout so no internal await can stall a scan.
- An earlier Opera run against unpatched `dist/` confirmed the scan error path: injection denied → `stage: error`, session state written (this is the expected behavior without the `activeTab` gesture; the popup click is what grants access).

Screenshots directory: `C:\Users\perki\AppData\Local\Temp\racction-shots\`

## Pending: real Gemini Nano run on the demo laptop

This machine has no Prompt API. On a capable laptop: load `dist/` in Chrome 138+, open Admin → **Download Gemini Nano**, rescan the demo pages, confirm AI-refined results ("AI inferred" statuses, offer summary, steps), and record the model version from `chrome://on-device-internals`. Then update the "real-inference verification" line in DISCLOSURES.md.

Not yet verified anywhere: popup button click-through with a real user gesture (the Opera run simulated it via host_permissions), PIN gate round-trip in a browser, settings→open-card live update, highlight scrolling.
