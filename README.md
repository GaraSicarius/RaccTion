# RaccTion

Portfolio version: restored to Chrome's Gemini Nano Prompt API on 11 October 2026. The temporary hackathon Qwen/llama.cpp provider has been removed. Gemini Nano inference still needs verification on compatible hardware; unsupported devices use the labeled keyword-only fallback.

RaccTion is a Chrome extension that scans a promo page and shows what it really asks for — a card number, an OTP, a fee, a subscription — with an effort score and trust signals, analyzed on your device by Gemini Nano (with a keyword-only fallback when the model isn't available).

## Features

- **One-click scan** from the toolbar: a scanning sweep runs over the page, then a result card pops up as an on-page overlay.
- **"What they'll ask for"** chips — payment upfront, card details, bank/e-wallet, OTP/PIN, mobile number, government ID, subscription, signup, download, minimum spend, sharing, personal details, in-person visit, survey — each backed by a quote you can highlight on the page.
- **Effort to claim** (Easy / Moderate / Hard) and **Trust signals** (No red flags / Be careful / High risk) — OTP asks, prizes that require payment, brand/domain mismatches, lookalike domains, suspicious TLDs, missing HTTPS, urgency pressure.
- **Keyword rules + Gemini Nano**: keyword hits show instantly; Gemini Nano then refines them with verified quotes — AI claims without a matching quote are labeled "AI inferred", never shown as fact.
- **Approved autofill**: after a scan, the card can find the fields on the page it *can* fill — name, email, mobile, address, postal code, birthdate — show you each one with the exact value, let you untick any, then fill them on your approval. It never fills passwords, card numbers/expiry/CVV, OTP/PIN/MPIN codes, bank or ID numbers, file uploads, hidden fields or consent checkboxes, and it never submits the form. Your details live in session storage (cleared when the browser closes); with an Admin PIN you can optionally keep an AES-GCM-encrypted copy.
- **Admin page**: model download/test, display order & toggles with live preview, editable + custom checks (including Filipino/Taglish keywords), trusted/blocked domains, autofill profile, scan history with JSON export/import, and an optional PIN lock.
- Works in **keyword-only mode** on browsers without the Prompt API (Edge, Opera GX); every scan degrades gracefully.

## Requirements

- **Gemini Nano (full AI):** Chrome 138+ on Windows 10/11, macOS 13+, Linux or ChromeOS, with ~22 GB free disk and a GPU with >4 GB VRAM **or** 16 GB RAM + 4 CPU cores. Chrome downloads the model once from Admin.
- **Keyword-only mode:** any Chromium browser that can load Manifest V3 extensions (tested on Edge 155 and Opera GX 136). Scans still work — the card notes that the AI wasn't used.

## Build & load

```powershell
npm install        # or: pnpm install
npm run build      # or: pnpm build  (tsc + vite + content-script IIFE)
```

Then load the unpacked extension:

- Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → choose `dist/`
- Edge: `edge://extensions`, Opera: `opera://extensions` — same steps.

On first install the Admin page opens; click **Download Gemini Nano** there (the first model download needs a user click on an extension page — it can't start from the service worker). On machines without Nano, everything still works in keyword-only mode.

## Demo

```powershell
npm run demo       # serves demo-pages/ — open the printed URL (http://127.0.0.1:5174 or next free port)
```

Open `index.html` from that server, pick one of the four synthetic promo pages, then click the extension icon → **Scan this page**. The prize page (a) is a fake "GCash" raffle that should read **Hard / High risk**; the honest free plan (d) reads **Easy / No red flags**.

## Tests

```powershell
npm test           # node --test tests/*.test.mjs
```

Covers the rule engine on all four demo scenarios, effort/trust thresholds, quote validation & normalization, negation handling, AI merge precedence, domain lists, settings merge/import, prompt building (budget, keyword windows, injection fencing), PIN hashing, and a service-worker orchestration smoke test with a mocked `chrome.*` surface.

## Project structure

```
popup.html / admin.html / overlay.html   # extension pages (Vite entries)
public/manifest.json  public/icons/      # MV3 manifest, rendered icons
src/background/index.ts                  # service worker: orchestrates the scan
src/content/                             # injected capture + sweep + iframe host + highlight
src/ai/                                  # prompt builder + Gemini Nano session (Prompt API)
src/lib/                                 # pure logic: types, categories, settings, rules, scoring, storage, pin, sample
src/popup/  src/overlay/  src/admin/     # popup, on-page result card, admin page
src/components/                          # Raccoon, ResultCard (shared), icons, ui/alert
demo-pages/                              # four labeled synthetic promo pages
tests/                                   # node --test suites (plain .mjs, import .ts directly)
```

## What runs locally / What requires internet

- **Local:** reading page text & forms, keyword checks, Gemini Nano analysis, scoring, the result card, settings/history/PIN/profile storage. Nothing is sent anywhere — profile values only ever go into the page fields you explicitly approve (and the page can read them the moment they're filled).
- **Internet:** the one-time Gemini Nano model download (performed by Chrome), and loading the websites themselves.

## Why local?

> Promo pages are exactly where people get asked for card numbers, OTPs, IDs and e-wallet logins. Sending those pages — and your browsing — to a cloud AI to check them would leak the very information you're trying to protect. RaccTion reads the page and runs Gemini Nano on your own device: nothing is uploaded, there is no API key or account, it costs nothing per scan, and once the model is downloaded it keeps working offline.

## Notes

- Node on this machine lives at `C:\Program Files\nodejs` — prepend it to PATH if it isn't already (`export PATH="/c/Program Files/nodejs:$PATH"` in Git Bash).
- Dependencies were installed with **pnpm** (`pnpm-lock.yaml`); `npm install` works too.
- The trust meter reports *signals, not a guarantee* — always check the domain yourself.
