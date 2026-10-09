# RaccTion — finalized build blueprint

> Superseded in parts by the implemented extension — see README.md.

Status: agreed product direction and proposed implementation, 9 October 2026. This document is a build specification, not evidence that the extension has been implemented or tested. Selected project name: RaccTion. Name, domain, and trademark availability have not been checked.

Implementation update: the user subsequently requested a supplied React component and mountain/cave parallax artwork. A separate React/TypeScript/Tailwind interface preview now exists at `racction/` in this workspace, with Framer Motion alerts and clearly labeled synthetic offers. This supersedes the earlier plain-JavaScript interface choice for the preview. Live AI, merchant-page capture, extension packaging, real autofill and encrypted persistent profiles remain pending. See `racction/README.md` and `racction/DISCLOSURES.md` for actual delivery scope and assets.

## 1. Product and purpose

### Brand and visual direction

- Project name: **RaccTion**. Use this capitalization in the interface, documentation, and demo.
- Selected animal identity: **raccoon**. The logo and visual theme follow this animal.
- Proposed logo: a raccoon face with eye-mask markings and paws holding an offer card. Final artwork has not been created.
- Proposed palette: charcoal, soft gray, and cream. Reserve red, amber, and green for analysis indicators; pair those colors with labels and icons.
- Proposed interface style: rounded shapes, readable text, and a compact layout. Keep source excerpts and conditions prominent.
- Proposed tagline: **“Inspect the offer. Know the conditions.”**

These are design specifications, not completed or licensed visual assets.

### Product flow

A desktop Chrome extension that explains what a person must do, pay, and qualify for to receive an advertised offer. The person activates it on the destination website. A compact interface presents conditions with source excerpts, dates, costs, steps, exclusions, and missing information. Analysis runs locally. Optional form assistance requires separate approval to locate a form and to fill it.

User flow: advertisement → click → destination website → activate extension → read findings → optionally locate a required form → approve filling → review and submit manually.

The normal flow requires no copying, highlighting, or manual text collection. Analyze one identified offer at a time. If several offers cannot be distinguished, ask the person to choose an offer rather than combine their conditions.

## 2. Source boundaries

Read the active page after activation. Discover directly linked promotion terms and retrieve a bounded selection automatically when access is permitted. Initial implementation limit: three relevant linked pages, no recursive crawl. This limit is a design choice, not a claim of complete coverage.

List each source URL, title, capture time, successful/failed retrieval, and content truncation. Reject unsupported URL schemes. Handle redirects and permission changes explicitly. If linked terms require additional access, explain the destination and request scoped browser permission; refusal leaves a visible coverage gap.

The original advertisement may not be available from the destination page. Label the claim source accurately: original advertisement when captured, otherwise landing-page headline. Display “Original advertisement not available” when applicable. Do not claim to compare against an unseen advertisement.

The first version handles accessible HTML text and ordinary forms. Image-only ads, PDFs, authenticated terms, dynamically rendered linked pages, and embedded cross-origin forms may need a later adapter. Display “Insufficient data to verify” when they prevent a finding. Do not silently treat omitted content as reviewed.

## 3. Results and display order

| Section | Required output |
|---|---|
| Offer | Stated benefit, quantity, included features, claim source |
| Costs | Pay now, qualifying minimum spend, deposit, stated fees, later/recurring charges; unknown components stay unknown |
| Eligibility | Stated location, new/existing customer, membership, age or other restrictions; user eligibility remains unchecked unless established |
| Steps | Ordered, source-supported actions, including signup, purchase, code entry, redemption, or verification when stated |
| Exclusions | Excluded items/add-ons, location restrictions, stated stock limitations, per-person limits, stacking rules |
| Dates | Separate campaign start/end, redemption deadline, trial duration, first charge, and cancellation deadline |
| Renewal/returns | Renewal amount/frequency, cancellation method, stated return/refund conditions |
| Evidence | Expandable exact excerpts and links for each finding |
| Coverage | Sources reviewed, unavailable sources, unresolved information, capture time |

First-view options: Key conditions (default), Costs first, Steps first, Dates first, Eligibility first. Save the selected order locally. Reorder existing findings without repeating inference.

Keep ad publication date separate from campaign dates and the extension's capture time. Publication date requires actual ad metadata. Preserve a stated timezone. Keep “30 days after signup” relative without a known signup date. Do not invent dates or countdowns from incomplete information. Contradictory dates show both passages and “Conflicting statements.”

Calculate totals with ordinary code only from explicit compatible amounts. Preserve currencies; do not combine minimum spend, deposits, and recurring payments into an unexplained total. Label calculations and their inputs. Unknown fees prevent a complete-total claim.

Example demonstration, using synthetic content: a headline promises “Free coffee”; terms require a qualifying purchase and exclude add-ons. The extension explains those conditions and links the passages. It does not call the merchant a scammer.

## 4. Warning indicator

Requested visual: a line from red to green, with a labeled position and evidence underneath.

- Red: More detected warning signs.
- Amber: Some detected warning signs.
- Green: Fewer detected warning signs in the reviewed content.
- Gray: Insufficient data to verify.

This is a review of accessible claims and conditions, not a fraud probability or authenticity guarantee. Green does not mean “safe,” “real,” or “guaranteed.” Do not show an invented percentage.

Proposed deterministic rule: a material coverage gap or unresolved interpretation makes the overall indicator gray. Otherwise, zero supported warning findings yields green, one yields amber, and two or more yields red. This threshold is a product rule to evaluate in tests, not a statistically validated fraud classifier.

Count only individually explained findings supported by excerpts: incompatible promises and terms for the same offer, contradictory essential dates/costs, or a mandatory payment inconsistent with a clearly unconditional free claim. A properly disclosed subscription or qualifying purchase alone is not evidence of fraud. Deduplicate findings. Include text and icons so color is not the only signal.

## 5. Form navigation and filling

After analysis establishes that a form is required:

1. Explain the source-supported requirement and ask “Go to the required form?”
2. On approval, scroll to and visibly highlight the matching form.
3. Show the destination domain and proposed field/value mapping. Ask “Fill these fields using your saved information?”
4. On approval, fill confidently matched, visible, ordinary fields.
5. Leave uncertain fields blank. The user reviews and submits manually.

When the requirement is not established, say “Possible registration form found.” Do not convert form detection into proof that signup is required.

Optional profile fields: name, email, phone, address. Never autofill passwords, payment information, OTPs, hidden inputs, legal acceptance, or marketing consent. Never submit, purchase, or accept a subscription automatically. The website may read inserted values before submission; disclose this before filling.

Revalidate tab, destination origin, form identity, and each field immediately before insertion. Canceling either approval must cause no corresponding action. Cross-origin navigation needs fresh access. AI output cannot supply executable scripts or arbitrary browser commands.

Profile storage design: session-only by default; optional persistence uses a passphrase-protected encrypted profile through Web Crypto. Keep the decryption key out of persistent storage. Do not call ordinary extension storage encrypted. Unlock only for filling; avoid profile values in model prompts, logs, or saved analysis. Provide edit, delete, and clear-history controls. Encryption design must pass implementation review before persisted profiles are enabled.

## 6. Selected technologies

| Layer | Planned selection | Purpose |
|---|---|---|
| Platform | Desktop Chrome, Manifest V3 extension | Activate on the current website |
| Interface | HTML, CSS, vanilla JavaScript | Compact toolbar popup, first-run setup/profile page |
| Local model | Chrome-managed Gemini Nano | Interpret captured promotion text through the Prompt API |
| Extraction | DOM APIs, injected content script | Collect relevant text, links, and supported form metadata |
| Coordination | Extension service worker and runtime messaging | Capture/retrieval requests and controlled page operations |
| Model execution | Extension popup initially | Structured extraction and explanation; handle popup closure explicitly |
| Evidence validation | JavaScript validation | Verify source IDs/excerpts, output shape, costs, dates, indicator rules |
| Storage | chrome.storage.session/local | Temporary findings, preferences, optional explicitly saved snapshots and encrypted profile |
| Profile encryption | Web Crypto API | Planned passphrase-based persistence, reviewed before use |
| Testing | Small JavaScript checks plus manual Chrome tests | Fixtures, evidence rules, browser permissions, form behavior, offline demo |
| Distribution | Unpacked extension for demo; public GitHub source | Reproducible hackathon setup |

No React, backend, database, vector database, training pipeline, cloud inference API, or paid API key is required by this design. These are scope decisions.

Chrome documents extension Prompt API support from version 138, with Gemini Nano downloaded separately. Windows requirements include 22 GB free on the Chrome-profile volume and either more than 4 GB VRAM or a CPU configuration with at least 16 GB RAM and four cores. Initial model download needs connectivity; later inference can run offline. The 22 GB requirement is free disk space, not the model's download size. Check actual availability and installed size on the demo machine. [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api).

Start with English text. Multilingual/Tagalog accuracy is not established. Use the same language/modality options for availability and model creation. [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api).

If Gemini Nano cannot run on the chosen demo machine, make an explicit stack decision before implementation. Ollama is a fallback candidate, not an installed or verified product component; its model and hardware fit remain unselected. Do not build two inference stacks for the first demo.

## 7. Permissions and network use

Initial permissions: activeTab, scripting, storage. Use optional host access only where needed for linked terms; configure a bounded supported origin scope and request access at the relevant user action. Avoid permanent access to every browsing page.

The activeTab grant follows user activation and has navigation limits. It does not recover an earlier advertisement. [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).

Cross-origin terms retrieval belongs in an extension context with appropriate host permission. Content-script requests retain origin restrictions. [Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

Planned network operations: downloading the browser model initially, loading merchant pages/terms, and the user's manual form submission. No product-controlled cloud inference, telemetry, analytics, tracking, or cloud profile sync in the first version. Merchant websites retain their own network behavior.

A Chrome popup closes when focus moves outside it. Save completed findings before highlighting a page form; reopening restores them. Put first-run download/setup in a dedicated extension page. If analysis is interrupted before completion, show that state and permit rerun; do not claim seamless background execution until tested. [Chrome popup documentation](https://developer.chrome.com/docs/extensions/develop/ui/add-popup).

## 8. Overall system

User activation → permission check → capture active-page text and form metadata → discover accessible directly linked terms → collect sources with IDs → local model extracts structured findings → code validates evidence and performs explicit calculations → render compact results → optionally locate/fill form after separate approvals.

Each finding stores: category, plain-language statement, status (stated/calculated/conflicting/unknown), source ID, exact excerpt, and structured values where applicable. Sources store URL, title, capture time, capture status, and reviewed text. Store no full DOM, cookies, browser passwords, or unrelated browsing history.

Split long sources into bounded chunks, retaining source IDs and text ranges. Aggregate only the same promotion. Mark omissions. Never present truncated processing as complete. Page text is untrusted input: embedded instructions cannot alter system rules, obtain profile data, or trigger actions. Render text safely rather than injecting returned HTML.

The model interprets language. Code owns permissions, storage, arithmetic, evidence checks, warning rules, and form actions. JSON shape validation cannot establish that a claim is true; require matching evidence and preserve uncertain interpretations.

## 9. Why Local AI and what is distinctive

Planned Local AI role: interpret saved promotion text on the user's device without a cloud inference request. After model download, captured content can still be analyzed during cloud/service interruption. Loading new websites, refreshing terms, checking live inventory, account eligibility, and submitting forms still depend on their respective services.

Planned innovation argument: connect a promotion's promise to actionable conditions, cited evidence, deadlines, transparent warning findings, and separately approved form assistance in one compact flow. Local inference enables private processing and analysis of saved content during outages. This is the proposed differentiation; worldwide novelty and judging outcome are “Insufficient data to verify.”

No custom training dataset is required by this pretrained-model design. Build an evaluation set rather than claim model training: original synthetic offers with known conditions, missing terms, inconsistent dates, recurring charges, multiple offers, and malicious page instructions. Any later public-page examples must record source/date and permitted use.

## 10. Disclosures: planned versus actually used

| Requested category | Planned product disclosure | Current verified status |
|---|---|---|
| Models | Chrome-managed Gemini Nano through Prompt API; record available runtime/model identification and Chrome version | Selected, not run for this product; exact installed model version/size: Insufficient data to verify |
| Technologies/frameworks | Manifest V3, HTML, CSS, JavaScript, DOM, Web Crypto, Chrome extension APIs | Specified, no implemented extension claimed |
| APIs/cloud services | Prompt API locally; scripting/runtime/storage/permissions; merchant-page retrieval | No cloud inference/backend selected; actual calls remain untested |
| Assets | Original UI, icons created for the project, synthetic offer/terms/form fixtures | Planned; no borrowed asset license or original asset completion claimed |
| Existing code | Record all imported libraries/snippets and licenses if introduced | No imported implementation code is established in this blueprint |
| AI development tools | OpenAI Codex; oh-my-codex skills and native-agent planning/review | Used for planning/research; update disclosure with actual coding/testing tools after build |
| Training/data | No fine-tuning; local captured text plus original evaluation fixtures | Dataset creation and evaluation remain pending |
| Data processing | Local interpretation; merchant content retrieved over network; approved form values reach the merchant page | Design commitment, verify with runtime/network checks before claiming delivered behavior |

Do not submit the planned column as proof of implementation. At code freeze, replace it with actual versions, dependency licenses, assets, service usage, test evidence, and remaining limitations. Disclose development assistance separately from the model running in the product. No Claude, Devin, cloud Gemini API, or Ollama use is claimed here.

## 11. Proposed project files and implementation order

These paths are future extension files, not existing source-code references. Keep the new extension separate from the existing Wi-Fi voucher application.

1. Runtime gate: confirm model availability, complete first download, record machine/Chrome/model information, and run one real local extraction. Do this before expanding the interface.
2. Create manifest.json, popup.html/css/js, setup.html/js, background.js, capture.js. Deliver activation → current-page capture → local analysis → sourced findings.
3. Add analysis.js for schema/evidence validation and chunk aggregation; rules.js for costs/dates/warnings. Add bounded terms retrieval and coverage reporting.
4. Add order preferences, uncertainty states, cancellable/interrupted analysis, source links, and explicitly saved offline snapshots.
5. Add forms.js and profile.html/js: locate/highlight approval, optional profile, encrypted persistence review, preview-and-fill approval, manual submission boundary.
6. Add fixtures/ and tests/; run the acceptance suite and actual browser checks. Prepare README.md, DISCLOSURES.md, demo recording, and reproducible installation instructions.

Build core analysis before form assistance; both remain in the agreed scope. Do not describe the full product as complete if the approved autofill flow is omitted. Completion time and throughput cannot be verified without an implementation run.

## 12. Acceptance criteria and verification

- Activation produces a compact result without manual text selection for an accessible fixture page.
- Every factual finding opens an exact supporting excerpt from a recorded source; unmatched evidence is rejected or unknown.
- Original-ad-unavailable and linked-source-denied cases visibly show their coverage gaps.
- A free-trial fixture separates introductory cost, renewal amount/frequency, and cancellation timing.
- A missing-date fixture has no invented expiry; conflicting deadlines remain visible with both excerpts.
- Multiple promotions are not merged; amounts in different currencies are not added.
- Priority changes reorder the same findings without another model call.
- Indicator rules are reproducible; coverage gaps yield gray; green has no authenticity guarantee.
- Prompt-injection fixtures cannot obtain profile values, alter the output contract, or trigger page actions.
- Canceling navigation leaves the page position unchanged; canceling fill leaves fields unchanged.
- Approved fill affects only previewed supported fields. A changed origin/form blocks stale actions. No flow submits or accepts consent automatically.
- Profile deletion removes saved profile data; locked encrypted profiles cannot be filled. No raw values appear in persisted logs/results.
- Popup closure/reopening preserves completed results; interrupted runs remain labeled incomplete.
- After model download, disconnect networking and analyze a saved fixture using real inference. Display capture time and “Live terms not rechecked.”
- Test keyboard operation, readable contrast, focus indication, labeled controls, and text alternatives to colors.
- Record end-to-end screenshots/video, runtime timings on the actual machine, model availability, and observed network requests. Do not invent accuracy percentages or latency targets.

Use synthetic pages for a repeatable demo, visibly labeled synthetic. Live merchant testing is additional evidence, not a substitute for controlled cases.

## 13. Hackathon handoff

Prepare a public repository with installation/recreation instructions, actual disclosures, test evidence, limitations, and a short demo. The supplied participant briefing specifies an approximately one-minute demo, social video tagging Devin/Cognition with #AppBuildersPH, and one submission through Cerebral Valley. Verify the exact current submission destination and account-specific requirements before sending. The previously discussed document conflicts are excluded from this plan at the user's instruction.

Source: [AppBuildersPH Hackathon 2026 Participant Briefing](C:/Users/pimis/Downloads/AppBuildersPH%20Hackathon%202026%20Participant%20Briefing.pdf). Submission is not performed by this blueprint.

Suggested demo sequence: show synthetiwac ad → land on offer page → activate → show cost/deadline/conditions and excerpts → reorder → demonstrate warning/unknown case → approve form scroll → separately approve fill → stop before submission → disconnect and analyze saved content.

## 14. Remaining risks and release gate

Insufficient data to verify: this computer's model compatibility, actual installed model size/version, extension behavior, extraction accuracy, latency, encryption implementation, live-page/form coverage, and worldwide novelty. No product runtime or acceptance tests have been completed.

Mitigations are explicit runtime gating, source coverage/excerpts, unknown states, bounded capture, deterministic rules, reviewed profile encryption, separate action approvals, and controlled fixtures. Local inference can still misinterpret a passage; exact-quote matching alone does not eliminate that risk.

Release only after the agreed core and form flow pass the acceptance checks and actual disclosure records are completed.
