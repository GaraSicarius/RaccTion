# RaccTion disclosures

## Models and inference

- **Qwen3 0.6B Q8_0** runs on the user's CPU through a pinned Windows build of **llama.cpp**. The extension calls the OpenAI-compatible endpoint at `http://127.0.0.1:8081`; the server is bound to loopback only and its CORS allowlist is set to the exact installed extension origin.
- Model: `Qwen/Qwen3-0.6B-GGUF`, file `Qwen3-0.6B-Q8_0.gguf`, pinned Hugging Face revision `23749fefcc72300e3a2ad315e1317431b06b590a`, SHA-256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`.
- Runtime: `ggml-org/llama.cpp` release `b11429`, Windows CPU x64 archive, SHA-256 `1283323272b04cd07905816a597a0da810918102de958f4ff6f7bbaa70ed2efe`.
- `scripts/start-local-ai.ps1` downloads these pinned artifacts only when verified local copies are unavailable. It checks exact file sizes and SHA-256 hashes before extraction or launch, then starts one CPU-only slot with two inference threads, a 4096-token context, the RAM prompt cache disabled, and model reasoning disabled.
- AI output is requested as structured JSON and treated as untrusted data. Every quoted claim is validated against the captured page text before it earns a "Required" label or a trust point. Claims without a matching quote remain visibly marked as AI inference.
- When the local server is unavailable, times out, or returns unreadable output, RaccTion finishes in **keyword-only mode** and says so on the card.
- Qwen3 0.6B is a small model selected for modest hardware. Its output can be incomplete or wrong; deterministic rules, evidence validation, and the visible fallback reduce but do not eliminate that limitation.
- **End-to-end extension inference verified on the development laptop:** a real scan of the synthetic prize demo page in Edge 155 completed with `aiUsed: true` and `aiModel: "Qwen3 0.6B"` in about 131 s on 2 CPU threads. See VERIFICATION.md.

## Technologies and frameworks

From `package.json` at submission time:

- React 19 / ReactDOM 19, Vite 8, TypeScript 5.9, Tailwind CSS 4 (@tailwindcss/vite), Framer Motion 12, lucide-react 1.53, clsx 2, tailwind-merge 3, @fontsource DM Sans 5 / Fraunces 5, @types/chrome 0.3, @types/node 22.
- Chrome Extension APIs: `scripting` (on-demand injection), `storage` (settings/history in `storage.local`, live scan state in `storage.session`), `action` (badge), `runtime` (messages, options page), `tabs` (capture/highlight messaging).
- Web platform: CSS Custom Highlight API (`::highlight(racction-hit)` + `CSS.highlights`) for "Show on page"; Web Crypto PBKDF2-SHA256 (150,000 iterations, 16-byte salt) for the optional Admin PIN; `structuredClone`, `AbortController` timeouts, and `fetch` to the loopback OpenAI-compatible endpoint.
- Local inference runtime: llama.cpp `b11429` (`llama-server`) and Qwen3 0.6B Q8_0. The runtime and model are not committed to the repository.

## APIs and cloud services

There is **no cloud inference service**, analytics service, API key, or model account. RaccTion does use a local HTTP backend: captured page text is sent from the extension to `127.0.0.1:8081` on the same device for inference. The server is not exposed on the LAN.

Internet access is used to load websites and, on first setup, to download the pinned llama.cpp archive from GitHub Releases and the pinned model file from Hugging Face. Those downloads are performed by the user-run PowerShell launcher and verified before use. Scanned page content is not sent to GitHub, Hugging Face, or a cloud model API.

## Existing code and assets

- The **RaccTion interface preview** was built earlier on 9 October 2026 during the same hackathon: design tokens, the raccoon SVG mark, and the Alert component (adapted from a user-supplied Framer Motion component whose original source URL and license remain unverified).
- `public/art/cave-background.jpg` — user-supplied artwork (source ZIP with EPS/JPG; creator/license/attribution rights unverified). Used on the Admin page hero.
- `public/icons/icon-*.png` — rendered from the raccoon SVG on a forest tile for this project.
- `demo-pages/` — synthetic promo pages written for this project; each is labeled "Synthetic demo page for RaccTion — not a real offer".
- `references/` — original supplied files (EPS artwork, briefing PDF, supplied component text) kept for provenance; not shipped in `dist/`.

## AI development tools

- **Devin (Cognition)** — planning, implementation, and testing of the Chrome extension (this delivery).
- **OpenAI Codex** — earlier interface work, plus assistance integrating the local Qwen3/llama.cpp provider, preparing the reproducible launcher and updating submission documentation. Codex is a development tool and is not used for product inference.
- The earlier interface preview also used **Impeccable** design guidance and an installed 21st CLI skill for component integration. No paid 21st asset was retrieved.

## User data

- Settings and scan history live in `chrome.storage.local` on the device; in-flight scan state lives in `chrome.storage.session`.
- The optional Admin PIN is stored only as a salted PBKDF2 hash (`adminPin`) — the export never contains it — and the unlock flag lives in session storage until the browser restarts.
- The **autofill profile** (all-optional name/email/mobile/address/postal/birthdate) lives in `chrome.storage.session` key `profile` and is cleared when the browser closes. With an Admin PIN, an optional "Remember on this device" copy is stored as `profileEnc` — AES-GCM-256, key derived via PBKDF2-SHA256 (150,000 iterations, separate salt), random IV. Profile values never enter prompts, scan results, history, exports, badge text or logs, and are never sent anywhere except into the page fields the user explicitly approves. Passwords, card/OTP/PIN, bank/ID numbers, uploads and consent checkboxes are never stored or filled, and RaccTion never submits forms.
- Export (`racction-export-*.json`) contains settings + history only — never `profile` or `profileEnc`.
