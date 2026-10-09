# RaccTion
<!-- impeccable:product-schema 1 -->

## Platform
Chrome extension (Manifest V3). Runs on Chromium browsers; Gemini Nano inference requires Chrome 138+ on supported hardware, keyword-only mode works everywhere else tested (Edge, Opera GX).

## Stack
React 19 + TypeScript + Vite, Tailwind CSS 4 tokens, Framer Motion (adapted supplied Alert), lucide-react. Three extension pages (popup / overlay / admin), an MV3 module service worker, and a standalone IIFE content script. Gemini Nano via the built-in Prompt API (`LanguageModel`), schema-constrained JSON output, every quote verified against the captured text.

## Users and purpose
People arriving on promotional websites who want to understand conditions before claiming an offer. RaccTion reads the active page on demand and answers: what will they ask for, how much effort it takes, and what looks risky — with page-backed quotes.

## Constraints
All processing is local; nothing is uploaded and no cloud API is used. AI findings without a matching quote are labeled "AI inferred". Demo coverage uses four labeled synthetic pages; real-page breadth is still being validated. `minimum_chrome_version` is 120 for Opera/Edge compatibility — Nano degrades to keyword mode where unsupported.

## Brand commitments
RaccTion name and raccoon identity, user-supplied cave artwork on the Admin hero, cream paper `#f6f1e5` / forest `#263d31` palette, DM Sans + Fraunces, square corners, reduced-motion support, semantic red/amber/green only for findings and trust.

## Evidence
Users act on: the "What they'll ask for" chips, Effort and Trust meters, costs, free-plan answer, steps and red flags. Trust shows "Signals, not a guarantee" and explains trusted/blocked-domain overrides.

## Accessibility
Keyboard-operable controls, labeled inputs, visible focus, ≥12 px text, ≥40 px targets, status text next to every color cue, `prefers-reduced-motion` honored in the scan sweep and transitions.
