# RaccTion prototype disclosures

## Models and inference

No runtime AI model is connected. Prepared, original synthetic scenarios drive the interface. Gemini Nano through Chrome's Prompt API remains the planned local model, not an implemented dependency.

## Technologies and frameworks actually included

React, TypeScript, Vite, Tailwind CSS, Framer Motion, lucide-react, clsx, and tailwind-merge. Versions are recorded in package-lock.json. Native browser APIs provide local storage, dialogs, media preference handling and scrolling. No backend or cloud database.

## Network and APIs

Development downloads dependencies from npm. The running preview loads its scripts, fonts and artwork from its local server. No cloud inference, analytics, external merchant fetch or submission endpoint is included. Production browser network behavior still needs separate testing before any broader privacy claim.

## Assets

- User supplied `mountain-with-entrance-dark-cave-mine-vector-parallax-background-2d-animation-with-cartoon-illustrat (1).zip` with `2111.w026.n002.1128B.p0.1128.eps` and `2111.w026.n002.1128B.p0.1128.jpg`.
- The JPG is stored as `public/assets/cave-background.jpg` unchanged. Its left artwork region is framed in the interface; the explanatory right panel is excluded from view. Parallax moves the flattened plane, not independent EPS layers.
- Asset creator, license, attribution requirements and redistribution permission: Insufficient data to verify. User provision alone does not establish redistribution rights. No Unsplash asset was substituted.
- Raccoon mark: simple SVG logo geometry authored for this prototype. No worldwide trademark or originality clearance is claimed.
- Fonts: locally bundled DM Sans and Fraunces from @fontsource npm packages. Preserve their package license files when distributing fonts.
- UI icons: lucide-react. Preserve applicable dependency license notices.

## Supplied components

The user supplied a Framer Motion Alert implementation and an attached alternate alert/button reference. The inline Framer Motion alert was integrated into `src/components/ui/alert.tsx`, adapted for the RaccTion palette, reduced motion, semantic live regions and optional native-button actions. Decorative hover tilt was removed. The attached expanded component system was not copied wholesale.

The original 21st catalog URL, author and component-specific license were not supplied. These remain unverified. No component retrieval from a paid 21st service or hosted 21st AI generation was performed.

## AI development tools

OpenAI Codex assisted implementation, original fixture authoring and verification. Impeccable supplied design guidance and review; the installed 21st CLI skill guided component integration. Native Codex agents implemented bounded components/data and reviewed the interface. These development tools are separate from product inference.

## User data

Display priority and sample IDs/save times persist in localStorage. Optional profile values remain in memory and clear on reload/close. The demonstration form uses values only after approval. No passwords, payment details or OTP fields are provided. No submitted account or merchant transaction is created by Finish demo.

## Delivery limitations

This is a working UI preview, not the completed promotion-analysis extension. Update this record after real inference, capture, extension packaging and autofill are implemented and tested.
