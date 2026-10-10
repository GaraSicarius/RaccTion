# Continue RaccTion on another computer

## What is complete

A working Manifest V3 extension built from the earlier interface preview. The popup starts a scan; the service worker injects `content.js`, captures page text/forms, runs keyword rules, upgrades to Qwen3 0.6B (local llama.cpp server) when it's running, scores effort & trust, saves history and sets the badge; the overlay shows the result card with expandable evidence and "Show on page" highlighting. A full Admin page covers the model, display (with live preview), checks (built-in + custom), domains, history (export/import), PIN security and About. Four labeled synthetic demo pages are included.

## Start here

1. Install Node.js 24+ (on the dev laptop it lives at `C:\Program Files\nodejs`; prepend it to PATH if needed).
2. `npm install` (or `pnpm install`), then `npm run build`.
3. Load `dist/` unpacked: `chrome://extensions` → Developer mode → **Load unpacked** (Edge: `edge://extensions`, Opera: `opera://extensions`).
4. Copy the extension ID from the extensions page, then run `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-ai.ps1 -ExtensionId <id>` and keep it open. Admin → Model should show the model as ready; without the server, scans run keyword-only.
5. `npm run demo` → open the printed URL → scan each demo page. `npm test` runs the logic + service-worker suites.

No API key is required. Extension state (`chrome.storage.local`: settings, history, PIN hash) does not migrate with Git.

## Pending product work

1. Broader real-page testing of Qwen3 0.6B output quality; see VERIFICATION.md for what has been checked.
2. Manual UX pass in the browser: popup flow, overlay minimize/close + highlight, Admin PIN gate, live preview.
3. Optional: richer form-field signals, more locales in keywords, per-domain exceptions UI.
