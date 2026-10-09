# RaccTion interface

React + TypeScript + Tailwind interface preview for the RaccTion Chrome-extension concept. Uses the supplied mountain/cave artwork and adapted Framer Motion Alert.

## Run

On another computer, download this repository or clone it, install a compatible Node.js version, and open a terminal inside the project folder. Use `npm.cmd ci` on Windows (or `npm ci` on macOS/Linux) to install the versions recorded in the lockfile. Then run `npm.cmd run dev` (or `npm run dev`). The previous computer's localhost address does not transfer; start the server on the new computer.

From this directory in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite. Use Node.js 22.12+ or a compatible later release. Development was checked with Node 26.8.1.

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run preview
```

The production build is in `dist/`. It must be served over HTTP; opening `index.html` directly as a file is not the supported preview method.

## Explore

- Choose one of three synthetic offers: conflicting coffee conditions, a disclosed recurring trial, or unavailable terms.
- Change which findings appear first, expand a finding, and open source evidence.
- Bookmark a sample review; open or delete it in Saved. This stores only the sample identifier and save time in local browser storage.
- Enter fictional details in Your profile and choose Use for this session. Profile data stays in React memory, not persistent storage.
- In Offer review choose Find the form, then Go to form. No fields are filled yet.
- Choose Preview autofill, inspect the field mapping, then Fill these fields. Cancel leaves fields unchanged. Finish demo never sends a signup request.
- Toggle background movement. System reduced-motion preferences also disable background movement and transition/animation effects.

## Structure

- `src/App.tsx`: interface, scenarios, saved reviews, profile and approval flows.
- `src/components/ui/alert.tsx`: supplied alert adapted for semantic feedback, keyboard actions and reduced motion.
- `src/lib/utils.ts`: shared class-name helper.
- `src/lib/demo-data.ts`: original synthetic offers and source passages.
- `src/lib/review-rules.mjs`: deterministic display rules and ordering.
- `src/index.css`: Tailwind import, tokens, layout and motion/accessibility rules.
- `components.json`: shadcn-compatible aliases, with `@/components/ui` mapped to `src/components/ui`.
- `public/assets/cave-background.jpg`: supplied asset, displayed through a cropped SVG viewport.
- `PRODUCT.md`, `DESIGN.md`, `DISCLOSURES.md`: scope, visual direction and provenance.
- `docs/BLUEPRINT.md`: complete product blueprint, included in the repository.
- `HANDOFF.md`: completed work, pending integrations and steps to resume elsewhere.
- `docs/images/`: desktop and compact-layout reference captures.
- `references/`: original EPS artwork, supplied component text, and participant briefing for continuation on another computer.

The file location `src/components/ui` is resolved by the `@/` alias; it is the component directory for this project. A filesystem-root `/components/ui` directory is not required. No additional shadcn initialization is needed for this setup.

## Current boundary

This delivery is an interactive interface prototype. The visible results are prepared fixture data. Gemini Nano inference, live page capture, merchant access, extension packaging, real merchant autofill and encrypted persistent profiles are not implemented. The app says this visibly. No real offer accuracy or privacy/security certification is claimed.

This is a separate project from the existing Wi-Fi voucher application. The current React stack implements the user's supplied component and supersedes the blueprint's earlier plain-JavaScript interface choice for this preview.

Review the background/component rights in DISCLOSURES.md before public redistribution.
