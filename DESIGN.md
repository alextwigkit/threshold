# Threshold — design contract

Current release: private version 3, including optional AI. Read [HANDOFF.md](HANDOFF.md) for current status, decision precedence and verification boundaries. Sections describing the initial build are historical where explicitly labeled.

## Foundation
Use the recovered latest Stitch screens in references/ as the visual foundation. Contemporary Personal Atlas: warm neutral ground, editorial serif, humanist sans, fine charcoal linework, quiet terracotta. This is the locked direction, not a starting point for another redesign.

## Tokens
- Ground: #FCF9F4; secondary surface: #F3F0EB.
- Ink: #20211E; muted text: #50534E; hairline: #DFDDD6.
- Accent: #AC3D24 (selected controls, meaningful route, observation label); use #C85235 only where contrast is not needed for small text.
- Display: Newsreader when bundled; Georgia fallback. Functional text: a restrained humanist sans such as locally available system sans; do not introduce Inter by default.
- Body 16–18px, line-height 1.5; headings 28–36px mobile; labels 14px minimum. Generous but purposeful spacing, 20px mobile gutters, readable 560px content column.
- Primary action: solid ink, warm-white text, approximately 52px high, modest radius. Form surfaces softly separated; no stacks of floating cards.

These numerical tokens translate screenshots into implementation; pixel values are engineering choices. Fonts must be bundled or have deliberate offline fallbacks. No remote font dependency required for the core loop.

## Composition
Name is an editorial question plus a large natural input, not a hero page. Clarify uses spare selectable rows. Setup combines compact territory fragment with exact action, prediction and Begin; the scale must not disappear beneath decorative space. Active centers the timer with a quiet circle and action, preserving room to return. Return uses typography and spaced controls, progressively revealed. Observation gives world response and a scoped claim. Home puts the trail above today's step, which leads; Trail / Atlas / Me is spare bottom navigation.

## Trail grammar
Home and Observation show a trail: one stone per step taken, oldest first, along a single path. Every mark encodes a stored field; nothing is placed for decoration or by hash.

| Channel | Data |
|---|---|
| Order along the path | when the step happened |
| Numbers under a stone | expected → experienced discomfort |
| Solid or half-filled stone | stayed, or stopped early (never a failure mark) |
| Word under a stone | what made it hard (territory short name) |
| Dashed open accent stone at the end | today's step, on Home only |
| Accent ring | the step that established a discovery |

- Start: a short bar the path leaves from. Only the latest four stones show; earlier steps collapse into "+N earlier", which opens the Atlas.
- Not started leaves no stone. Opening the app, waiting or tapping Begin never changes the trail.
- The step just recorded is the largest stone on Observation and settles in once.
- Tapping a stone opens that encounter in the Atlas.
- Accent means only today's step, a discovery ring, or the observation label.

Rich illustrative inhabitants remain future authored assets, unlocked only by recurring behavior evidence.

## Motion
A short stone settle and discovery ring can provide curiosity and satisfaction, about 400–800ms. No endless pulsing or mandatory wait. Respect prefers-reduced-motion; information remains understandable with animation disabled. Never fabricate history.

## Copy contract
The model reasons; the product speaks. UI strings come from reviewed templates. Action text may contain user-edited or validated situation-specific slots. Never directly render arbitrary model prose as a psychological conclusion.

Allowed concepts: Threshold, trail, step, territory, expedition, explore, path, observation, discovery, inhabitant. World language may communicate real state (unknown, familiar, stopped here). Functional actions use ordinary language: Continue, Begin, I'm back, Stop, See my trail.

Prohibited: coordinates, elevations, scales, folios, taxonomy, protocols, invented records, faux scientific metadata, motivational praise, “Great job”, AI sparkles, chat bubbles, gradient buttons, glass surfaces, XP, streaks, badges, dashboard analytics, card grids. No hard-coded “Another Step into The Fog” recommendation. Never use “Follow the initial clarity before the doubt returns.”

## Review checklist
Compare each implemented screen with its reference for hierarchy, spacing, palette and interaction meaning. Apply only documented corrections. Check 320/390px widths, desktop, keyboard, 200% text and reduced motion before release. A technically built screen is not proof of visual or device QA.

## Evidence projection continuation
Stone order is stable by createdAt then encounter ID, including when older history is restored; restoring never changes an existing stone except its step number. Mark qualified discoveries with a ring on the establishing stone, not a fictional named landmark. Atlas entry eyebrows filter the Atlas by territory.


## September 7 integration update

Optional AI suggestions preserve the approved screens and first-use flow. The current contract, privacy disclosure, bounded request limits and validation status are recorded in [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md). AI remains off until the user opts in; observations, discoveries and trail evidence remain local and deterministic.
