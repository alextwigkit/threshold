# Hierarchy redesign (blind-audit driven)

Baseline: 2026-09-27, screenshots `.playwright-mcp/base-*` (390x844, sharp + 7px blur). Three blind auditors: all 11 states NOT READY.

## Intended ranking

| Screen | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Name | text field | question | Continue |
| Clarify | choice list | question | Continue |
| Setup | step field | rating scale | Begin (above the fold) |
| Active | timer | step | I'm back |
| Return (each state) | open question's controls | question text | Continue |
| Observation | expected vs experienced | title | See my map |
| Map | today's step + Explore | map (largest by area, per DESIGN) | Work on something else |
| Atlas | latest entry | page title | footer note |
| Me | Keep your map / Export | privacy line | Delete (quietest) |

## Baseline causes (convergent across auditors)

1. One pale box used for inputs, echoes, notices, choice lists and answered rows, so nothing stands out; fields read as holes.
2. Controls (radio, checkbox, scale cells) are hairline pale, so question text or buttons win.
3. Accent red spread across eyebrows, nav, dates, Delete.
4. Tier-1 text (finding, step title, latest entry) sized like secondary headings; page titles win.
5. Setup: Begin below the fold; notice and echo take the top.

## System changes

- Act-here surfaces: white `--field` fill plus `--field-border` (3:1) for fields, choice groups, scale cells.
- Done/context: no box. Echo and answered rows become plain rows; notice becomes a meta line.
- Controls: radio/checkbox strokes in `--muted-foreground`.
- Accent only for selected controls, route, observation label (DESIGN). Nav active = ink + weight; default eyebrow = meta colour.
- Disabled primary: outline, not a grey slab.

## Rejected auditor suggestions

- Outline "See my map" / Explore: DESIGN locks primary = solid ink. Tier 1 grows instead.
- Shrinking the Home map below the step: DESIGN gives the map most visual weight; capped only so both actions fit.

## Status

- [x] Implement
- [x] Round 1 (`v6-*`): Name, Clarify, Active, Return 1-2, Observation, Map, Atlas, Me READY. Setup NOT READY (scale outranked the field, loud note link, Begin 7px from the fold). Return 3 NOT READY (outlined "Continue" read as enabled).
- [x] Round 2 (`v7-*`): Setup (quieter scale, firmer field, label removed, Begin 37px clear), Return 3 (Skip until checked), Atlas, Me READY. Observation NOT READY (numbers tied with title).
- [x] Round 3 (`v8-observation`): 64px numbers, 24px title, shorter map. READY.
- [x] tsc, tests, commit

Open nits (not blocking): 6+5 scale wrap; selected scale chip's rust fill outweighs the filled field; Map eyebrow and situation line read as one band; privacy note vs Delete mass on Me.

## Spacing follow-up

Owner feedback after 9c78c5b: screens felt scrunched. Cause: the hierarchy pass demoted things by shrinking gaps as well as size, and compressed Setup to keep Begin above the fold; auditors were only asked what reads first.

- Added `--space-block` (24px) between pair (16) and group (40): context or heading to the next block.
- Setup's suggestions notice moved below Begin (the title already says "Choose your own step").
- Header gap 40 to 24 on flow screens; question hints bind to their question (8px) with the answers 24px below.
- Map: eyebrow and situation line pair at 4px, 24px to the title, 40px under the map, 24px between the two actions.
- Clarify question 1.625rem so the answer list leads; choice dividers firmer.
- Observation: 24px above the numbers.

Audits (now also asked about crowding): v9 Clarify and Map NOT READY (crowding), rest READY; v10 Map READY, Clarify (question outweighed list) and Observation (numbers squeezed) NOT READY; v11 all three READY.
