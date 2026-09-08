# Validation and implementation status

Status after private version 3 publication and signed-in browser verification, September 8, 2026 UTC. [HANDOFF.md](HANDOFF.md) is the cold-start entry point and records provenance, release identifiers, and decision precedence. This file separates completed checks from outstanding verification; it supersedes the initial-build status.

## Implemented

- Seven approved Stitch states with the explicit 0–10 prediction, progressive return, and multi-select noticing corrections.
- Bundled Newsreader, paper/ink/terracotta styling, responsive controls, and evidence-derived SVG map.
- Editable steps and resistance correction; timestamp timer; persisted drafts and encounters; duplicate suppression.
- Dynamic local recommendations, honest observations, and two independent provisional discoveries with inspectable supporting and contrary evidence.
- Device-local export, reviewed merge/restore, confirmed deletion, and another-tab conflict warning.
- PWA manifest, icons, and built-asset offline cache that excludes API requests.
- Optional AI suggestions with default-off consent, minimal request data, reviewed templates, schema/runtime validation, cancellation, and stale-response protection.
- Private authenticated API Worker, configured hosted secret, and atomic D1 limits of 10 requests/day and 150/month in UTC. D1 does not store encounter history.

## Completed checks

- **43 automated tests passed**, covering behavioral evidence, multi-select, zero prediction, timing, correction, backup validation, idempotency, stable map geometry, inference boundaries, cancellation, quotas, and Worker authentication.
- Type checking and production build passed.
- Six final synthetic live model examples passed: proposal, reply, checking, ambiguity, safety-critical checking, and explicit correction. Initial evaluation exposed template incompatibilities and correction failures; prompt and schema constraints were tightened before the final passing run.
- Packaged Worker returned 200 for the interface and 401 without authenticated identity. Private deployment succeeded.
- A signed-in browser check passed through consent → synthetic proposal situation → model-rendered three-minute step → prediction. No prediction was preselected; Begin was disabled until a response; selecting zero enabled it. No expedition was begun or encounter recorded. The visible test situation was cleared and AI restored to off.
- **Complete local-path browser journey verified** against the packaged Worker preview with synthetic data, AI left off. Covered name → clarify → setup → active → return → observation → map, plus Atlas and Me. Specifically confirmed: the timestamp timer resumes at the correct elapsed time after a reload and clamps at `00:00` without recording an encounter; progressive reflection reveals one question at a time; "Nothing stood out" clears other notices and any real notice clears it; a stopped encounter yields non-punishing copy and reduces the next dose to one minute; a not-started encounter adds no map route and no expected/experienced row; keyboard arrow selection on the 0–10 scale works through a single roving tab stop. Zero console errors or warnings throughout. Test data was cleared afterwards.
- **320px layout and 200% zoom verified** on the densest screens: no horizontal overflow at either setting.
- The last dependency audit reported zero production vulnerabilities and four moderate advisories in Drizzle's legacy development tooling chain. That development server is not deployed. Re-audit when dependencies change.

The identity-less Sites gate-bypass token returned 401 at the hosted AI endpoint as expected. This is not an API-key failure; the subsequent signed-in browser request succeeded.

## Accessibility corrections from the browser pass

Found by walking the flow with the accessibility tree rather than screenshots, and fixed:

- The 0–10 scale announced every option twice ("0 0", "7 7") because the radio item carried an `aria-label` duplicating the visible number, and it was wrapped in both a `fieldset` and a same-named `radiogroup`, so the question was announced twice. It is now a single named `radiogroup` whose options announce once.
- The scale's end captions were not associated with the control, so a screen-reader user never learned its polarity. They are now wired through `aria-describedby`.
- The same end captions were **visually misleading below 500px**: the scale wraps to a six-column grid, which left "No discomfort" sitting under 6 and "Very uncomfortable" past 10. Each end now names its own number ("0 · No discomfort", "10 · Very uncomfortable"), which reads correctly at any wrap.
- The clarify screen's resistance group and the return screen's urge group were unnamed `radiogroup`s; both now reference their visible heading.
- The noticing checkboxes had no grouping semantics at all; they are now a `fieldset` labelled by "What did you notice?" and described by "Choose any that fit."
- The active-screen timer put `aria-label` on a role-less `div`, where it is not reliably honoured; it now uses `role="timer"`.
- The decorative dot before "Time keeps counting…" was read aloud; its `content` now carries empty alt text.
- On Me, "Export my data" and "Restore a backup" rendered edge to edge with no gap, reading as one underlined string; they now sit in a spaced row.

These are semantic and spacing corrections only. No screen was recomposed and no copy principle changed.

## Text resize pass

Font sizes were authored in `px`, so raising the browser's default font size did nothing at all: the app was immune to text-only resize (WCAG 1.4.4). All 35 `font-size` declarations are now `rem`, and everything the enlarged text then broke was fixed:

- **The action textarea clipped its last lines.** A textarea scrolls instead of growing, so a fixed height hides the end of a long step, which is the single most important string on the setup screen. All textareas now fit themselves to their content after each render and on resize, and their `min-height` floors moved to `rem`. The manual resize handle was removed, since a self-sizing box that snaps back on the next keystroke is worse than no handle.
- **The timer circle stayed 200px while its digits doubled**, so `05:00` burst out of the ring. The circle is now sized in `rem` and scales with the digits.
- **Observation and discovery headings overflowed the viewport**, because a single long serif word ("Uncomfortable,") cannot fit 342px at 60px type. `overflow-wrap: break-word` now applies from `body` down. It only engages when a word genuinely cannot fit, so nothing moves at normal size, and it also protects against long words in whatever the person types.
- **The fixed bottom nav grows with its labels, but the padding reserving space for it did not**, which would have hidden the end of Map, Atlas and Me behind it. That clearance is now `rem` too.
- The `min-width: 500px` query deciding whether the 0–10 scale is six or eleven columns is now `31.25em`, because whether eleven numbers fit depends on the text size, not the viewport alone.
- Radio and checkbox indicators are `rem`, so a control keeps pace with the label beside it.

Two things stayed in `px` on purpose: **map text**, which sits inside a `viewBox` and must stay proportionate to the geometry it labels, and **44px touch targets**, which are a physical minimum rather than a text-relative one.

Verified afterwards at a doubled root font size across name, clarify, setup, active, return, observation, map, Atlas and Me: no horizontal overflow, no clipped text, no content behind the nav. Also verified unchanged at normal size, at 320px, and at the 195px equivalent of 200% zoom. Zero console messages throughout.

## Outstanding verification and limitations

- Complete signed-in **AI-enabled** return → observation → map journey against the hosted deployment. The local-path journey is verified; the model-backed setup step is verified only as far as the prediction.
- Physical iOS/Android installation, offline relaunch, and real background/lock-screen timer behavior. Reload-resume is verified, which is a proxy, not the real thing.
- Verification with an actual screen reader (VoiceOver/NVDA). The accessibility tree and keyboard flow were checked programmatically, which catches missing names and broken semantics but not announcement quality or reading order in practice.
- The text-resize pass was verified by raising the root font size, which reproduces what a browser text-size preference does to `rem`-based CSS. It does not reproduce the `em` media query, whose unit tracks the browser default directly. Confirm the scale's six/eleven-column switch against a real browser font-size setting.
- Visual comparison against the saved Stitch references was done by eye for the seven states and matches on composition, type hierarchy, and palette. It is not a pixel diff.
- Broad action quality, language/cultural coverage, and longitudinal usefulness. Six live examples verify a narrow integration boundary, not general reliability or efficacy.
- The optional WebMCP situation-staging tool was advertised/registered in the browser but was not invoked end to end. It must not begin an encounter itself.
- Discovery thresholds are provisional. Additional patterns, inhabitants, richer authored map changes, and secondary-territory geography are not completed features.
- AI does not receive history, reflections, predictions, or the freeform resistance note. Today's Edge is selected locally. Cross-device sync is not implemented.

Automated coverage and successful publication do not replace these checks. Preserve the approved flow and use synthetic or isolated test data without inventing approach evidence in the user's map.
