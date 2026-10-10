# Verification — 10 October 2026

Scope: the working MV3 extension build (`dist/`), checked on the development laptop (2 CPU cores, 7.7 GB RAM, Intel UHD, no discrete GPU). Local AI is **Qwen3 0.6B Q8_0** on a CPU-only llama.cpp `llama-server` (`127.0.0.1:8081`). Gemini Nano was dropped because this hardware is below Chrome's requirements.

## Automated checks

- `node --test tests/*.test.mjs` — **39/39 pass**. Covers the rule engine on all four demo scenarios (effort + trust), negation filtering, AI merge precedence and downgrade of `mentioned` findings, quote validation/normalization, thresholds, trusted/blocked domains, settings merge + import validation, prompt budget/injection fencing, PIN hash/verify, autofill matching/exclusions/crypto, the local llama.cpp client (availability, schema validation, truncated/invalid responses, timeouts) and service-worker orchestration smoke tests.
- `npm run build` — clean: `tsc -b` + `vite build` + `vite build -c vite.content.config.ts`.

## Real end-to-end scan with local Qwen3 0.6B

- **Edge 155.0.4283.45** (headless, fresh profile) loaded a copy of `dist/` whose only change was a `host_permissions` entry for `http://127.0.0.1/*`, simulating the `activeTab` click. The scan of `demo-pages/prize.html` was started via `chrome.runtime.sendMessage({type:'scan'})` from the Admin page.
- Pipeline: `content.js` injected → page captured → keyword rules → Qwen3 via llama.cpp → scoring → `stage: done`.
- Result: `aiUsed: true`, `aiModel: "Qwen3 0.6B"`, no fallback note, **131 s** total.
  - Effort **hard (15)**, trust **high risk (10 pts)**, `offerType: free_item`.
  - Upfront cost **₱99**, plus three steps extracted by the model.
  - `payment_upfront` upgraded to **required** from the AI quote "Pay ₱99 and claim iPhone". Card, OTP/PIN, mobile and personal-info findings came from the form scan.
- The overlay card footer read **"Analyzed on this device by Qwen3 0.6B · no cloud AI · 131.3s"**.
- Inference speed measured on this CPU: about 6 tokens/s prompt evaluation and about 2.7 tokens/s generation.

### Issues found and fixed

- **Service worker suspended mid-inference.** On the first attempt, Edge terminated the background worker while it waited on the long local `fetch`, so the scan stalled at the AI stage. The worker now calls a trivial extension API every 20 s while inference runs, which resets the idle timer.
- **Timeout headroom.** The 131 s run was aided by llama.cpp reusing the prompt prefix from the stalled attempt. The AI timeout was raised from 180 s to 240 s to leave room for a cold scan; slower scans still finish with keyword results and a visible note.

## Earlier keyword-only checks

- **Edge 155 headless:** the extension loaded with no manifest errors, the first install opened Admin, and the popup, overlay and Admin pages render.
- **Opera GX 136 headless:** a real keyword-only scan of the prize page completed with effort hard and trust high. The overlay rendered inside the live page and history was saved.
- **Autofill in Opera:**
  - matched full name, mobile and delivery address;
  - skipped the card, expiry, CVV and OTP fields;
  - an approved fill populated three fields;
  - a fill on the wrong site was refused.

## Not yet verified

- A popup click-through with a real user gesture (the runs above simulate it through `host_permissions`).
- The PIN gate round-trip in a browser.
- A cold scan, with no prompt prefix cached, completing within 240 s after the keep-alive fix.
- Breadth of Qwen3 0.6B output quality on real (non-demo) promo pages.
