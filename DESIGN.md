---
name: RaccTion
description: A cream inspection sheet in a charcoal mountain hideaway.
colors:
  paper: "#f5f3ed"
  ink: "#292b29"
  muted: "#696a61"
  line: "#deded3"
  forest: "#374c41"
  charcoal: "#292b31"
  white: "#fff"
  warning-surface: "#ece0c5"
  warning-text: "#704818"
  info-surface: "#e3e7e5"
  info-text: "#45544c"
  success-surface: "#e0e8da"
  success-text: "#395035"
  error-surface: "#f0ded8"
  error-text: "#823d30"
  secondary-surface: "#e5e7db"
  secondary-text: "#414c3b"
  input-surface: "#faf9f3"
  input-border: "#cacfbf"
  preview-surface: "#e6e8dd"
  preview-text: "#62665b"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(48px, 5.4vw, 75px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-.045em"
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-.04em"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.025em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    lineHeight: 1.8
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  field: "6px"
  button: "7px"
  compact: "8px"
  indicator: "10px"
  sheet: "16px"
spacing:
  compact: "8px"
  control: "12px"
  comfortable: "16px"
  section: "24px"
  sheet-inset: "28px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.secondary-text}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.input-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  preview-tag:
    backgroundColor: "{colors.preview-surface}"
    textColor: "{colors.preview-text}"
    typography: "{typography.label}"
    padding: "5px 8px"
---

# Design System: RaccTion

## Overview

**Creative North Star: "The mountain hideaway inspection sheet"**

The approved raccoon identity and supplied mountain/cave illustration frame a quiet cream inspection sheet. Charcoal surroundings separate the brand introduction from the compact, readable findings. The illustration remains a single flattened plane; paper and typography stay still.

This record describes the implemented responsive interface preview. Findings are prepared synthetic fixtures, and the visible preview labels preserve that boundary. No live AI, merchant page capture or real merchant autofill is represented as delivered.

**Key Characteristics:**

- Raccoon identity and supplied mountain/cave artwork.
- Cream paper, charcoal surroundings and forest actions.
- Compact findings, visible evidence and explicit status text.
- Stationary reading surface with optional background motion.

## Colors

### Primary

Forest identifies primary actions, active navigation and evidence links. Semantic warning, information, success and error pairs identify feedback; the review track also uses muted red, amber and green. Status is always expressed in words.

### Neutral

Paper carries the inspection sheet and dialogs. Ink carries primary reading text; muted carries supporting text; line separates findings and navigation. Charcoal is the page fallback behind the shaded illustration. Secondary and preview surfaces provide quiet local grouping. Frontmatter values are normative.

**The Explicit Status Rule.** Color supports the written warning indicator; it never certifies an offer as safe.

## Typography

**Display Font:** Fraunces with Georgia and serif fallbacks. The installed font import supplies weight 500.

**Body Font:** DM Sans with a sans-serif fallback. Installed imports supply weights 400, 500, 600 and 700.

The brand-side display uses a soft serif; findings and controls use compact sans-serif text. The hierarchy is not a single proportional scale: workspace headings, offer titles and numeric facts have distinct roles.

- **Display:** frontmatter desktop clamp; narrows to (58px) at 1100px, (43px) at 850px and (35px) at 480px.
- **Headline:** workspace title; mobile size (22px). Dialog heading is (22px), then (20px) on mobile.
- **Title:** offer heading; mobile size (16px).
- **Body:** substantive findings and supporting copy use (12px), with observed line heights from (1.5) to (1.8). Introductory copy uses (16px), then (14px) and (12px).
- **Label:** controls and field labels use (12px). The final mobile overrides retain (11px) navigation labels and a (10px) count badge; these are compact exceptions, not substantive-copy defaults.
- **Numeric facts:** (21px), weight (600), line height (1.25), tabular numerals; mobile size (19px).

**The Compact Reading Rule.** Preserve the corrected 12px substantive copy and distinguish it from the smaller mobile navigation exceptions.

## Layout

The page shell has maximum width (1400px) and desktop padding (36px 58px 24px). The desktop grid combines a flexible introduction of at least (260px) with a sheet of at most (620px), separated by (60px). The introduction is sticky at (90px); the grid starts (48px) below the header.

At 1500px and above, grid top spacing becomes (64px). At 1100px and below, page padding is (28px 32px 22px), grid gap is (32px), the introduction minimum is (225px), and the sheet column maximum is (570px). Sheet horizontal insets become (23px).

At 850px and below, the layout becomes one column with a compact introduction, maximum shell width (720px), padding (24px 26px), gap (30px) and sheet maximum (620px). The introduction loses stickiness; its link, field note and footnote are hidden. At 480px and below, shell padding is (20px 14px), gap is (24px), sheet content padding is (23px 18px), tabs spread across the width, footer text stacks and the evidence row wraps. The body minimum width is (320px).

Dialogs use width `min(480px, calc(100% - 32px))` and maximum height `calc(100dvh - 40px)` with vertical scrolling. Internal padding is (27px), then (23px) on mobile.

## Elevation & Depth

The supplied JPG is displayed through an SVG viewport (`0 0 5000 2000`) against its source dimensions (8502 by 2000), excluding the explanatory region. A gradient shade supplies the dark reading backdrop; at 850px and below it becomes `rgba(24,29,30,.69)`.

- **Sheet:** `0 20px 65px #0c141140`.
- **Dialog:** `0 22px 80px #0b120d66`; backdrop `#172019ab`.
- **Toast:** `0 8px 40px #0b17194d`.

**The Still Sheet Rule.** Only the background plane moves: pointer displacement is at most 10px horizontally and 6px vertically, with scale (1.04) and an (800ms) `cubic-bezier(.16,1,.3,1)` transform transition. Fine pointers, the manual toggle and OS reduced-motion preference gate motion. Reduced motion removes transforms, animations, transitions and smooth scrolling.

## Shapes

The principal paper and dialog radius is the sheet token. Controls use gently curved button and field corners; compact groupings use the compact token. The review indicator uses the indicator token. Round status dots and support icons remain circular. Findings use divider lines rather than separate raised cards.

## Components

### Buttons

Primary and secondary buttons use the frontmatter tokens, minimum height (41px), inline icons and (9px) gaps. Primary hover becomes `#263c31`; secondary hover becomes `#d9dece`. General color transitions run (180ms). Disabled controls use opacity (.55) and a disabled cursor.

The final hit-target correction gives icon buttons and header controls minimum width and height (40px), and evidence/text actions and selects minimum height (40px). The indicator help control also has a (40px) minimum width. Finding rows already have minimum height (45px). The base icon size (36px) is superseded by the final minimum dimensions.

### Cards / Containers

The inspection sheet uses paper, the sheet radius and the sheet shadow. Findings are separated by the line token. Workspace header padding is (20px 28px 17px); workspace content padding is (27px 28px 24px). Responsive inset changes are recorded in Layout.

### Inputs / Fields

Fields use the frontmatter surface, ink and field radius, a (1px) input-border stroke, minimum height (42px) and top margin (7px). Native email and telephone input types remain in use. All keyboard focus uses a visible (2px) `#708e72` outline offset (4px).

### Navigation

Three workspace tabs use icons, muted inactive text and a transparent (2px) bottom border. Active navigation uses forest, weight (700) and a forest underline. Desktop tabs have (27px) gaps; mobile tabs distribute across the sheet. The count badge reports saved sample reviews.

### Preview tag

The compact tag labels the interface preview and demonstration form. Its radius is (5px); the interface tag includes a circular (5px) status dot.

### Review indicator and alerts

The indicator has a muted gradient track and explicit labels; unknown data replaces the track with a neutral fill and removes the pointer. Alerts use the semantic feedback pairs, compact radius and padding (10px 12px). Entrance motion is opacity plus (6px) vertical displacement over (200ms) with `easeInOut`; reduced motion removes the entrance. No hover tilt is retained.

## Do's and Don'ts

### Do:

- Do retain the supplied illustration, raccoon identity and stationary cream reading surface.
- Do preserve 12px substantive copy and the corrected 40px minimum targets.
- Do keep visible preview labels, evidence passages and explicit unknown states.
- Do respect the motion toggle, fine-pointer gate and OS reduced-motion preference.

### Don't:

- Don't replace the supplied mountain/cave artwork with stock photography.
- Don't describe the warning indicator as a safety certification.
- Don't imply live AI analysis, refreshed merchant terms or real submissions in this fixture preview.

Not canonized: the 11px mobile tabs and 10px count badge are recorded as observed compact exceptions, not a new body-copy scale. Runtime contrast and rendered font appearance require the parent verification evidence; source inspection alone does not establish them.
