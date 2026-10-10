# RaccTion

RaccTion is a Chrome extension that scans a promo page and shows what it really asks for — a card number, an OTP, a fee, a subscription — with an effort score and trust signals. Its AI analysis runs locally with Qwen3 0.6B through a CPU-only llama.cpp server, with a keyword-only fallback when the server is unavailable.

## Features

- **One-click scan** from the toolbar: a scanning sweep runs over the page, then a result card pops up as an on-page overlay.
- **"What they'll ask for"** chips — payment upfront, card details, bank/e-wallet, OTP/PIN, mobile number, government ID, subscription, signup, download, minimum spend, sharing, personal details, in-person visit, survey — each backed by a quote you can highlight on the page.
- **Effort to claim** (Easy / Moderate / Hard) and **Trust signals** (No red flags / Be careful / High risk) — OTP asks, prizes that require payment, brand/domain mismatches, lookalike domains, suspicious TLDs, missing HTTPS, urgency pressure.
- **Keyword rules + local Qwen3 0.6B**: keyword hits show instantly; the local model then refines them with verified quotes — AI claims without a matching quote are labeled "AI inferred", never shown as fact.
- **Approved autofill**: after a scan, the card can find the fields on the page it *can* fill — name, email, mobile, address, postal code, birthdate — show you each one with the exact value, let you untick any, then fill them on your approval. It never fills passwords, card numbers/expiry/CVV, OTP/PIN/MPIN codes, bank or ID numbers, file uploads, hidden fields or consent checkboxes, and it never submits the form. Your details live in session storage (cleared when the browser closes); with an Admin PIN you can optionally keep an AES-GCM-encrypted copy.
- **Admin page**: local-model status and setup, display order & toggles with live preview, editable + custom checks (including Filipino/Taglish keywords), trusted/blocked domains, autofill profile, scan history with JSON export/import, and an optional PIN lock.
- Works in **keyword-only mode** if the local server is stopped or cannot be reached; every scan degrades gracefully.

## Requirements

- Windows 10/11 with PowerShell 5.1 or newer and a Chromium browser that can load Manifest V3 extensions.
- About 800 MB of free disk space for the pinned llama.cpp CPU runtime and Qwen3 0.6B Q8_0 model.
- Internet access for the first local-AI download and for visiting online promo pages. Inference itself does not use a cloud service.

## Build & load

```powershell
npm install        # or: pnpm install
npm run build      # or: pnpm build  (tsc + vite + content-script IIFE)
```

Then load the unpacked extension:

- Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → choose `dist/`
- Edge: `edge://extensions`, Opera: `opera://extensions` — same steps.

Copy the 32-character extension ID shown on the browser's extensions page, then start the local model from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-ai.ps1 -ExtensionId abcdefghijklmnopabcdefghijklmnop
```

Replace the example ID with your actual ID. The script accepts only a valid Chromium extension ID, reuses a verified sibling `local-ai` cache when present, or downloads pinned official files into `.local-ai/`. It verifies exact byte lengths and SHA-256 hashes before starting. Keep the PowerShell window open while scanning.

The server listens only on `127.0.0.1:8081`, allows browser requests only from that exact extension origin, and runs the model on two CPU threads. The extension sends captured page text to this same-device loopback server; it does not send the text to a cloud inference API. If the server is unavailable, RaccTion finishes with keyword results and clearly notes that AI was not used.

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
src/ai/                                  # prompt builder + local llama.cpp client
src/lib/                                 # pure logic: types, categories, settings, rules, scoring, storage, pin, sample
src/popup/  src/overlay/  src/admin/     # popup, on-page result card, admin page
src/components/                          # Raccoon, ResultCard (shared), icons, ui/alert
demo-pages/                              # four labeled synthetic promo pages
tests/                                   # node --test suites (plain .mjs, import .ts directly)
```

## What runs locally / What requires internet

- **Local:** reading page text and forms, keyword checks, Qwen3 0.6B inference through `127.0.0.1`, scoring, the result card, and settings/history/PIN/profile storage. Profile values only go into page fields you explicitly approve (and the page can read them the moment they are filled).
- **Internet:** the launcher's first download of the pinned llama.cpp runtime and model, plus loading the websites themselves. Later inference works without internet as long as the local files and server are available.

## Why local?

> Promo pages are exactly where people get asked for card numbers, OTPs, IDs and e-wallet logins. RaccTion sends captured page text only to a Qwen3 0.6B server bound to the same device's loopback address. There is no cloud inference API, API key, or model account, and inference can continue offline after the initial files are downloaded.

## Notes

- Node on this machine lives at `C:\Program Files\nodejs` — prepend it to PATH if it isn't already (`export PATH="/c/Program Files/nodejs:$PATH"` in Git Bash).
- Dependencies were installed with **pnpm** (`pnpm-lock.yaml`); `npm install` works too.
- The trust meter reports *signals, not a guarantee* — always check the domain yourself.
- Qwen3 0.6B is a small model chosen to run on modest hardware. It can miss, misread, or infer details, so RaccTion validates quoted evidence against captured page text and keeps deterministic keyword checks as a fallback.
