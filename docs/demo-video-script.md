# RaccTion one-minute demo

Record only after a real scan completes with the result footer **“Analyzed on this device by Qwen3 0.6B”**. If that footer does not appear, fix the local server first; do not present a keyword-only result as AI inference.

## Before recording

1. Build the extension and load `dist/` as an unpacked extension.
2. Copy its 32-character ID from `chrome://extensions`.
3. From the repository root, run `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-ai.ps1 -ExtensionId <your-extension-id>` and keep the window open.
4. Open the synthetic raffle demo, pin the RaccTion extension, and fit the browser and terminal on screen without exposing unrelated tabs or personal data.
5. Complete one practice scan. Base the narration on the result actually shown; do not memorize a risk rating that the live scan does not produce.

## Shot plan and narration

**0:00–0:08 — Problem and product**  
Show the synthetic promo page, then the extension popup.

> “Promo pages can hide payments, subscriptions, OTP requests, and other conditions in the fine print. RaccTion is a browser extension that explains what an offer really asks from you.”

**0:08–0:18 — Prove the local model is running**  
Briefly show the PowerShell window with the server listening on `127.0.0.1:8081`, then return to the page.

> “For AI analysis, this demo runs Qwen3 0.6B locally through a CPU-only llama.cpp server. It listens only on this laptop’s loopback address, so the scan does not use a cloud inference API.”

**0:18–0:40 — Perform the real scan**  
Click **Scan this page**. Keep the progress card visible as it reaches **Asking Qwen3 0.6B (on this device)**. Let the actual result finish, then point to its effort, trust, and requirement chips.

> “I’ll scan this synthetic raffle now. RaccTion reads the page, runs deterministic checks, asks the local model, and scores the result. The result surfaces the effort and trust signals, then lists the conditions it found.”

**0:40–0:52 — Evidence, validation, and model proof**  
Click one **Show on page** action so its source text is highlighted. End on the completed result with the **Analyzed on this device by Qwen3 0.6B** footer visible.

> “Each confirmed claim is backed by a quote that can be highlighted on the page. Model output is treated as untrusted: quotes are checked against the captured text before they count as evidence.”

**0:52–1:00 — Privacy and resilience**  
Show the local-AI status in Admin or keep the result footer visible.

> “There is no API key or cloud model account. If the local server is unavailable, RaccTion still finishes with its keyword scan and clearly labels that fallback.”

## Final recording check

- The recording shows a live scan, the Qwen3 AI stage, a completed result, one matching page quote, and the Qwen3 result footer.
- The page is visibly labeled as a synthetic demo.
- The narration says **no cloud inference API** rather than implying the entire website or browser is offline.
- No unverified speed, accuracy, hardware-capability, or security claim is added.
- Keep the final cut close to one minute and use the actual on-screen result labels.
