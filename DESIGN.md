# Edge — design contract

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
Name is an editorial question plus a large natural input, not a hero page. Clarify uses spare selectable rows. Setup combines compact territory fragment with exact action, prediction and Begin; the scale must not disappear beneath decorative map space. Active centers the timer with a quiet circle and action, preserving room to return. Return uses typography and spaced controls, progressively revealed. Observation gives world response and a scoped claim. Home gives most visual weight to the map with an integrated recommendation underneath; Map / Atlas / Me is spare bottom navigation.

## Map grammar
Map geometry is an interactive representation of stored evidence, not a geographic claim. Stable territory placement and stable encounter positions are required. Existing traces do not relocate randomly on render.
- Unknown: unresolved linework, sparse visibility, no territory catalog.
- Encountered: territory name appears; an attempted action adds an actual-history trace.
- Familiar: stronger line continuity derived from repeated encounters, never a percentage or completion status.
- Current: restrained terracotta candidate/active direction, visibly distinct from permanent history.
- Stopped: incomplete line or truthful “stopped here” annotation.
- Discovery: an evidence-backed feature resolves; repeated opening never grows it.

The Fog dissolves at boundaries; The Spotlight has exposed/radiating structure without a bullseye; The Open Loop has approaching but incomplete contours; Still Water has continuous calm structure. Preserve one visual world. Implement functional map paths and states as code-native vector geometry, not a background screenshot. Rich illustrative inhabitants remain future authored assets, unlocked only by recurring behavior evidence.

## Motion
Short terrain reveal and route draw can provide curiosity and satisfaction, about 400–800ms. No endless pulsing or mandatory wait. Respect prefers-reduced-motion; information remains understandable with animation disabled. An old path may join new evidence, but never fabricate causal history.

## Copy contract
The model reasons; the product speaks. UI strings come from reviewed templates. Action text may contain user-edited or validated situation-specific slots. Never directly render arbitrary model prose as a psychological conclusion.

Allowed concepts: Edge, map, territory, expedition, explore, path, observation, discovery, inhabitant. World language may communicate real state (unknown, familiar, stopped here). Functional actions use ordinary language: Continue, Begin, I'm back, Stop, See my map.

Prohibited: coordinates, elevations, scales, folios, taxonomy, protocols, invented records, faux scientific metadata, motivational praise, “Great job”, AI sparkles, chat bubbles, gradient buttons, glass surfaces, XP, streaks, badges, dashboard analytics, card grids. No hard-coded “Another Step into The Fog” recommendation. Never use “Follow the initial clarity before the doubt returns.”

## Review checklist
Compare each implemented screen with its reference for hierarchy, spacing, palette and interaction meaning. Apply only documented corrections. Check 320/390px widths, desktop, keyboard, 200% text and reduced motion before release. A technically built screen is not proof of visual or device QA.

## Evidence projection continuation
Keep route geometry stable by encounter ID, including when older history is restored. Clear texture only around real attempted routes. Draw settled paths once during the observation reveal, with reduced-motion fallback. Mark qualified discoveries with a restrained evidence-linked map mark, not a fictional named landmark. Known territory labels are accessible links to that territory's Atlas evidence.
