# RaccTion
<!-- impeccable:product-schema 1 -->

## Platform
Chrome extension (Manifest V3). Runs on Chromium browsers; AI analysis uses Qwen3 0.6B on a CPU-only llama.cpp server on the same device (`127.0.0.1:8081`), and keyword-only mode works whenever that server isn't running.

## Stack
React 19 + TypeScript + Vite, Tailwind CSS 4 tokens, Framer Motion (adapted supplied Alert), lucide-react. Three extension pages (popup / overlay / admin), an MV3 module service worker, and a standalone IIFE content script. Qwen3 0.6B (Q8_0 GGUF) via llama.cpp's OpenAI-compatible endpoint, schema-constrained JSON output, every quote verified against the captured text.

## Users and purpose
People arriving on promotional websites who want to understand conditions before claiming an offer. RaccTion reads the active page on demand and answers: what will they ask for, how much effort it takes, and what looks risky — with page-backed quotes.

## Constraints
All processing is local; page text only goes to the loopback llama.cpp server and no cloud AI is used. AI findings without a matching quote are labeled "AI inferred". Demo coverage uses four labeled synthetic pages; real-page breadth is still being validated. `minimum_chrome_version` is 120 for Opera/Edge compatibility.

## Brand commitments
RaccTion name and raccoon identity, user-supplied cave artwork on the Admin hero, cream paper `#f6f1e5` / forest `#263d31` palette, DM Sans + Fraunces, square corners, reduced-motion support, semantic red/amber/green only for findings and trust.

## Evidence
Users act on: the "What they'll ask for" chips, Effort and Trust meters, costs, free-plan answer, steps and red flags. Trust shows "Signals, not a guarantee" and explains trusted/blocked-domain overrides.

## Accessibility
Keyboard-operable controls, labeled inputs, visible focus, ≥12 px text, ≥40 px targets, status text next to every color cue, `prefers-reduced-motion` honored in the scan sweep and transitions.
