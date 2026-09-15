# Validation and implementation status

> September 12 decision: the owner explicitly requested removing the AI suggestions section and making suggestions always on. Situation/resistance continuation now requests the existing model automatically when online, including on fresh browsers and after local data deletion. The old consent preference is no longer read. Existing minimal payload, API limits, validation and offline fallback remain. Earlier default-off/toggle instructions below are historical and superseded. This authorization applies to the current private personal app.

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

## Map scrutiny pass

The map had never been rendered by a test: the runner is plain Node with no DOM, so only `projectMap()` was covered, by two assertions that compared its output against itself. Scrutinising the geometry numerically over the full reachable range of every hash seed, rather than by eye, found that the map was stating things that were not true.

**A one-time relocation was accepted.** The endpoint formula was wrong, so correcting it moves existing routes once. This is a deliberate correction, not the random per-render drift the design forbids; after it, positions are stable and remain a pure function of the encounter id. A golden-coordinate test now pins the exact numbers, which nothing did before, so a future change to the hash or the layout cannot silently relocate a person's whole history with the structural tests still green.

Corrected:

- **Endpoints landed outside their own terrain.** Every endpoint was displaced a fixed distance *below* its anchor rather than scattered around it, putting Fog marks at y 155..208 against terrain ending at 165, and Still Water at y 377..430 against waves ending at 372. Endpoints are now sampled area-uniformly in an ellipse fitted inside each territory's drawn glyph.
- **Still Water collided with the route origin**, so an encounter there was indistinguishable from one that never left home. The origin moved to bottom-centre and the unrequested `+35` displacement penalty for stopping was dropped.
- **Unknown endpoints were painted over** by the Spotlight label, which was drawn after the routes on an opaque plate. Names now carry a halo instead of a plate, so routes read through them.
- **Established discoveries re-animated on every observation.** The reveal was gated on a condition that never referenced the discovery, so finishing any encounter replayed the pop for every discovery ever made. It is now gated on the discovery the last encounter actually established. Ring radius derives from the rule rather than array position, which previously made the first and third discoveries collide exactly.
- **A stopped route halted at a fraction of the way along the curve**, which stranded 57% of stopped Fog routes inside another territory's label. It now ends where the curve first meets the field. The obvious follow-up fix, trimming a flat percentage of the curve, was also wrong: the Bézier parameter is not arc length, so it dragged marks a whole field-width back down the approach. The pullback is measured in map units.
- **The texture saturated after 20-30 encounters** and repeated encounters drew parallel strands rather than the specified line continuity. Routes now pass through a shared per-territory gate, so repetition composites into a darkening trunk. This needs no sibling awareness, so every route's geometry stays a pure function of its own id.
- **The compact setup preview cropped away everything below y 343** and wasted 43% of its width, which for Still Water meant a label and nothing else. Each territory now has its own viewBox window.
- **The map announced "Select a territory to see its encounters" on screens where nothing was selectable.** That sentence now appears only where `onTerritory` is passed, and the description names the route count, the most recent territory and whether it was stopped.
- The territory focus ring was 1.5 user-space units against an assumed 0.855 map scale (~1.28 CSS px) under `outline: none`. It is now 3, measured in the browser at the map's actual rendered scale (~0.955) as ~2.86 CSS px.

Found by the browser pass, after the numeric work was already green:

- **The "stopped here" note printed straight through The Spotlight.** The tests checked marks against labels but not the note, and the note is the only place the map says a word about what happened. Measured from the rendered SVG: a 22×11 unit overlap. The note now tries below, then above, then further out, with a small centred rung for the one narrow band no vertical shift alone can clear, and a test sweeps the note's box, inflated by the same margin the painted halos need, against every label in every territory.
- **The label extents used by the tests were guesses, and wrong in both directions** — too wide, and 1.3 units too short to cover ink below the anchor. They are now measured from the rendered SVG and exported once, shared by the placement code and the tests rather than duplicated as magic numbers.
- The note is now haloed like the labels, since its own route ran under it, and it is suppressed in the compact preview, where a note from an unrelated earlier encounter arrived clipped at the crop edge.

**Findings from a subsequent three-axis code review**, applied before this landed: the label/note collision check permitted exactly-zero clearance and didn't account for the painted stroke halos (now a required 4-unit margin, `inkMargin` in `lib/map.ts`, itself pinned to the CSS halo widths it exists to cover); the golden test pinned only one territory, leaving each other territory's gate and field centre unpinned (now one arrived and one stopped endpoint per territory); `labelInk`/`noteInk` had no check tying them to reality, and a first attempt at bounding them by territory-name length was still loose enough to let a 21% shrink through undetected, which independent verification showed reintroduces real note-over-label overlap (now golden-pinned to the exact measured values instead of bounded); the note's x-offset was hand-duplicated in the renderer, the placement code and the test (now one shared `noteInk.dx`, itself part of the same golden pin); the discovery-animation gate had no test at any level for the id-stability property it depends on (now pinned directly); `notePlacement`'s fallback rung was unexercised by any test, and a first version of that test couldn't distinguish the fallback firing from rung 18 being chosen on its own merits, since both return the same value (now asserts every rung's canvas-bound check fails first). `originBox` and `shape()`'s start formula, previously two copies of the same literals, now share one source. A follow-up verification pass, run independently against the fix rather than trusting the description of it, is what caught the loose bound and the ambiguous fallback assertion.

Verified against the packaged Worker preview with synthetic data: all five territories with attempted and stopped encounters; Still Water on both the map and the preview; a discovery establishing and then not re-animating on the following encounter; roughly 40 encounters, where the texture still reads as partly unknown and marks stay distinguishable; the accessibility tree on setup, observation and map; keyboard territory selection and the focus ring. Reduced motion was checked for the failure mode where a draw-on animation leaves its element stuck in its hidden initial state: both the route and the discovery ring render fully visible with animations disabled. Zero console messages throughout. Test data was cleared afterwards.

Map tests went from 2 assertions to 15 tests; the suite is at 58, all passing on Node v24.19.0. `tests/suggestions.test.mjs` has a `ERR_SQLITE_ERROR` reported on Node v22.17.0 during this review; it reproduces at the parent commit too, so it is a pre-existing, Node-version-dependent flake unrelated to the map, not a regression from this pass.

## Cloudflare-direct deployment and rename (Threshold)

Added a second deployment path so publishing no longer depends on the ChatGPT/Codex session that owns Sites, and renamed the app Edge → Threshold at the same time (both explicit owner decisions; see HANDOFF.md). The Sites deployment is untouched.

Replaced the Sites dispatcher's `oai-authenticated-user-id` trust with a server-side session: D1-stored accounts (`users` table, seeded by hand via `scripts/seed-user.mjs`, no signup route), PBKDF2-SHA256 password hashing with a per-user random salt (Workers-native Web Crypto, no WASM dependency), and an HMAC-signed HttpOnly/Secure/SameSite=Lax session cookie checked by `server/worker.ts` in front of every route — static assets included, not just `/api/*`, since there is no dispatcher upstream to rely on anymore. Login attempts are rate-limited (10/day per identity) using the same atomic D1 increment-with-cap pattern already proven in `server/quota.ts`.

12 new tests in `tests/suggestions.test.mjs` cover: password hash/verify round-trip and salt uniqueness; session creation, expiry, wrong-key rejection, and payload tampering; cookie header round-trip; login-attempt rate limiting (independent per identity, resets the next day); the worker redirecting unauthenticated page requests to `/login` and 401ing unauthenticated API requests; a forged-signature cookie rejected the same as no cookie; a full wrong-password → right-password → authenticated-request → logout cycle through `worker.fetch` directly, no live server needed. One existing test in `tests/inference.test.mjs` was updated: the origin-based CSRF check it exercised moved from `handler.ts` into the worker's session gate (a valid session now implies same-site, and `SameSite=Lax` covers the rest), so `handleSuggestion` itself no longer takes a `trustedOrigin`.

Verified against a real local `wrangler dev` run, not just the unit tests: applied the new migration to a local D1, seeded a real account with `scripts/seed-user.mjs`, then over HTTP confirmed unauthenticated `/` redirects to `/login`, unauthenticated `/api/suggestion` 401s, a wrong password 401s, the right password sets a working session cookie and reaches the app shell, and `/logout` clears it. This caught a real bug the unit tests couldn't: `wrangler dev` only auto-loads `.dev.vars` from next to the config file it's given (`dist/server/`), not the project root, so `SESSION_SECRET` was silently empty and login 500'd. Fixed by having `scripts/worker.mjs` copy the root `.dev.vars` into `dist/server/` on every build, and reverified clean.

Sessions are stateless (signed tokens, no revocation list) — `/logout` clears the browser's cookie but not the token itself before its 30-day expiry elsewhere. A conscious tradeoff for a single/few-owner private app, recorded in HANDOFF.md, not an oversight.

**Deployed and verified live September 13, 2026**, with the owner's own Cloudflare credentials: https://threshold.threshold0.workers.dev. Confirmed over real HTTP requests against the live Worker, not just locally: unauthenticated visits redirect to `/login`, a wrong password 401s, the right password sets a working session and reaches the app, all matching the local `wrangler dev` pass exactly. See HANDOFF.md section 9 for the account/database facts. No data migration from the Sites-hosted app was needed — the owner confirmed there was nothing real there yet.

## UX/polish pass and two real bugs found by using the live app (September 14-15, 2026)

Prompted by the owner actually using Threshold rather than reading the code. Verified live with Playwright throughout (full name → clarify → setup → active → return → observation → map → atlas → me walkthrough), zero console errors/warnings.

- **Setup screen redesign**: removed the compact map thumbnail + territory name from the setup screen. It previewed a fragment of the person's own accumulated map, which does not exist yet on a first situation — it read as an unexplained empty rectangle, confirmed directly by the owner. The plain-language territory description stays; the real map still renders correctly once there is real history (verified on the observation/map screens with an actual route).
- **Added a mechanic-note** ("You'll leave the app to try this for real...") before the discomfort-prediction question, since nothing on the setup screen previously said the app expects you to leave, try the real thing, and report back — the prediction question made no sense without it.
- **Login page redesign**: rebuilt to match the app's actual design tokens (Newsreader, palette, `.primary`-style button, real `<label>` elements instead of placeholder-only inputs). Required exempting `/fonts/*` from the session gate in `server/worker.ts`, since the login page needs the typeface before any session exists.
- **Spacing pass**: every CSS value off the project's own 4px baseline (26, 42, 18, 22, 58, 6, 10, 25, 9px) moved onto it. Grounded in 8pt-grid convention research, adapted to the 4px scale Tailwind (already imported in this project) actually uses.
- **Touch-target fix**: the discomfort scale's 11-column layout used to activate at 500px width, giving ~35px-wide buttons in the touch-primary tablet range. Moved to the same 700px breakpoint `.shell` already uses for its desktop layout, verified live: 600px width now gives 82×44px buttons; the residual ~40px width at true desktop sizes (capped by `.shell`'s 560px max-width) is now confined to a mouse-primary context and documented as a known limitation, not silently accepted.
- **Unified the two back-button styles** (`.preferences-back`'s bordered box vs. the plain chevron used everywhere else) into one.
- **Real bug, found live, not in code review**: the local engine's water-territory detection matched only the exact word "feeling", not "feel" — so an AI-classified water encounter's own local re-derivation on the next Map-screen preview silently reclassified to a different territory, while a separate "preserve the AI's better wording" mechanism kept showing the old water action text anyway. Net effect: "Today's Threshold · 3 MIN" next to an action that said "For 1 minute" — internally contradictory, live on the Map screen. Fixed by broadening the regex to word stems; added a regression test that constructs the exact failure and asserts title/minutes/action stay consistent.
- **Local-path safety-critical routing, decided and implemented**: the AI path has always had an explicit instruction to route coercion/danger/medical-legal-financial/self-harm-adjacent situations to a blank, user-written step. The local (non-AI) fallback had no equivalent — flagged as an open gap earlier, left unfixed pending a product decision. Owner chose to add a keyword-based guard mirroring the AI path's own categories, conservative by design (biased toward under-catching over over-catching). Verified against medication/doctor, self-harm phrasing beyond the literal word "suicide" (e.g. "end my life"), lawyer/eviction, and confirmed ordinary situations are unaffected.

## Outstanding verification and limitations

- Complete signed-in **AI-enabled** return → observation → map journey against the hosted deployment. The local-path journey is verified; the model-backed setup step is verified only as far as the prediction.
- Physical iOS/Android installation, offline relaunch, and real background/lock-screen timer behavior. Reload-resume is verified, which is a proxy, not the real thing.
- ~~Verification with an actual screen reader (VoiceOver/NVDA)~~ and ~~confirming the scale's six/eleven-column switch against a real browser font-size setting~~ → dropped, not outstanding: accessibility is explicitly out of scope for this project per the September 15, 2026 decision in HANDOFF.md. The programmatic accessibility-tree/keyboard checks and the `rem` text-resize conversion already shipped stand as-is; no further a11y verification is planned.
- Visual comparison against the saved Stitch references was done by eye for the seven states and matches on composition, type hierarchy, and palette. It is not a pixel diff.
- The label and note ink extents in `lib/map.ts` were measured from the rendered SVG at the current font, sizes and territory names. They are constants, not computed at runtime, so changing the map type or renaming a territory requires remeasuring them; the collision tests are only as honest as those numbers.
- Map density was verified at roughly 40 synthetic encounters. Behaviour at several hundred is untested.
- Broad action quality, language/cultural coverage, and longitudinal usefulness. Six live examples verify a narrow integration boundary, not general reliability or efficacy.
- The optional WebMCP situation-staging tool was advertised/registered in the browser but was not invoked end to end. It must not begin an encounter itself.
- Discovery thresholds are provisional. Additional patterns, inhabitants, richer authored map changes, and secondary-territory geography are not completed features.
- AI does not receive history, reflections, predictions, or the freeform resistance note. Today's Threshold is selected locally. Cross-device sync is not implemented.
- The Cloudflare/Threshold deployment is live and verified over HTTP (see above), but only with curl, not a real browser. No screen-reader, keyboard, reduced-motion, or visual pass has been done against this specific deployment yet — the local-path browser/accessibility pass earlier in this document predates the rename and the login screen.

Automated coverage and successful publication do not replace these checks. Preserve the approved flow and use synthetic or isolated test data without inventing approach evidence in the user's map.
