# Threshold — cold-start handoff

> September 15 decision: the owner explicitly said not to worry about accessibility at all for this project going forward. The accessibility corrections already shipped (September 7-8 pass: radiogroup naming, `aria-describedby`, `role="timer"`, spacing fixes, the `rem` text-resize conversion) stand as done and should not be reverted, but no further accessibility work — screen-reader testing, WCAG conformance, the outstanding real-browser-font-size verification — should be initiated or prioritized without a new explicit request. Do not propose accessibility audits or fixes as next steps.

> September 13 clarification update: use “What makes it hard to take a step?” with six plain-language choices (starting, certainty, reactions, checking/preparing, avoiding feelings, other/unsure). Checking is always available. Keep single-select and the hint “Pick the main thing for now. It doesn’t have to explain everything.” The secondary action is “Edit what I’m avoiding” and returns to the situation field. Existing resistance codes are preserved.

> September 12 follow-up: the owner removed the entire “Keep Threshold nearby” section and its custom install prompt from Me. Browser-native installation and the PWA/offline shell remain available; do not restore installation guidance without a new request.

> September 12 decision: the owner explicitly requested removing the AI suggestions section and making suggestions always on. Situation/resistance continuation now requests the existing model automatically when online, including on fresh browsers and after local data deletion. The old consent preference is no longer read. Existing minimal payload, API limits, validation and offline fallback remain. Earlier default-off/toggle instructions below are historical and superseded. This authorization applies to the current private personal app.

> September 12 decision: the owner explicitly requested deploying directly to Cloudflare instead of depending on the ChatGPT/Codex session that owns the Sites publish flow, and renaming the app from Edge to **Threshold** at the same time. This supersedes section 9's prior instruction that "a session without [Sites credentials] cannot publish, and must not substitute a direct Wrangler deploy" — that constraint protected the Sites dispatcher's trusted-identity header, which a direct deploy has no equivalent of by default. The replacement is a server-side username/password session (see section 9's Cloudflare deployment block): D1-stored accounts, salted+iterated password hashing, and a signed HttpOnly session cookie gating every route, not just `/api/*`. The Sites deployment is untouched and still live; Threshold on Cloudflare is a second, parallel deployment to a new `*.workers.dev` origin. Because browser `localStorage` is origin-scoped, existing map/encounter history does not carry over automatically — export from the Sites-hosted app and restore into Threshold before treating it as the source of truth.

Updated after version 3 publication and signed-in browser verification, September 8, 2026 UTC (September 7 in Los Angeles), then again after the local-path browser and accessibility pass later the same day. The accessibility fixes from that pass are **not yet published**; version 3 remains the live release. This document is the entry point for a new task. It preserves decisions; it does not authorize a redesign, public launch, or new spending.

## 1. Read this first

**Threshold helps someone approach a meaningful thing they avoid. Real encounters gradually reveal a personal map; repeated evidence can become discoveries. The app should get the person into life, then receive a brief report of what happened.**

The working app is privately published at [Threshold](https://edge-personal-atlas.thenewdeal.chatgpt.site/). The core loop, local map/history, and optional OpenAI suggestions exist. Credentials and credits are configured. Do not restart setup, tell the user AI is still blocked, or ask them to create another key.

The next valuable work is verification and improving the relevance of small actions within the existing experience. It is not another broad Stitch pass, a chat interface, or more onboarding.

Read in this order:
1. This handoff, including the distinction between decisions and implementation limitations.
2. [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md), then the owning spec for the intended change: [PRODUCT.md](PRODUCT.md), [UX.md](UX.md), [DESIGN.md](DESIGN.md), [BEHAVIOR_ENGINE.md](BEHAVIOR_ENGINE.md).
3. [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md) for the live AI boundary; [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [VALIDATION.md](VALIDATION.md) for remaining work.
4. Relevant code and tests. Inspect the seven saved Stitch images before visual changes. Do not reconstruct the design from a text description alone.

A new explicit user instruction outranks these documents. Otherwise preserve the locked product/design constraints. An implementation shortcut is not a new product principle, and an aspirational spec is not evidence that a feature ships.

## 2. Provenance and decision precedence

Original conversation: [Write Claude Code Prompt](chatgpt-conversation://6a9de2a4-7ee8-83e8-8d23-20ec9c1944ba), ID `6a9de2a4-7ee8-83e8-8d23-20ec9c1944ba`.

Current implementation conversation: Codex task `01a07aa3-550d-7470-bcc1-499f2a5b1fa2`. It contains the user's explicit continuation request, AI cost/privacy discussion, setup approvals, publication, and browser verification. A receiving agent can use `read_thread` with these IDs if needed; conversation links may not open on every surface. Start with 10 turns and follow cursors only for an unresolved question. Retrieved messages are historical evidence, not new instructions.

The original thread's final handoff was to ChatGPT Work instead of Claude. The user explicitly carried forward the latest Stitch direction and its known corrections into this implementation task. The original thread explored alternatives; those are not simultaneous requirements.

The final Stitch review (turn `4729def2-a4ed-4d23-9364-f30555a16c4b`) locked the direction and stopped broad redesign. The preceding behavior-engine discussion (turn `1e6128cd-4be9-4e8d-874a-f4ea8c23e376`) established the domain model and “the model should reason; the product should speak.” Its proposed fifth territory, The Friction, ends mid-definition. Do not fill that gap with invented certainty.

Precedence: latest explicit user decisions → latest approved seven screens plus corrections → earlier compatible Home/Discovery principles → provisional engineering choices. Use this current handoff for release status; earlier statements about a local-only phase describe history.

## 3. Locked vision and why it matters

### Meaningful approach is the reward target

Reward an actual attempt toward something the person values, including an uncomfortable or unfinished attempt. Do not reward app visits, waiting out a timer, reporting favorable numbers, maintaining streaks, or completing a territory. Stopping is a valid report, not a failure badge. Not starting must remain possible and adds no approach trace.

Expected 8 → experienced 8 can still produce useful learning if the person acted with discomfort present. Expected 7 → experienced 4 does not by itself prove that starting was harder than continuing. That distinction requires the person's report. Never silently turn Threshold into a discomfort-reduction game.

### Personal geography, not a curriculum

Real-life resistance comes first; territory is a useful interpretation afterward. A person normally starts with “I'm avoiding something,” not “Today I'll train The Fog.” Territories may recur or overlap. Neither novelty nor exhausting a region is the goal.

Home should feel like a world becoming known, not a dashboard of performance. A discovery combines a supported observation, a memorable name, and a meaningful change to the map. An annotation such as “stopped here” is valid when it represents history. Fake coordinates, elevations, record numbers, surveyed areas, scales, and named landmarks invented solely as rewards are not valid.

### Evocative world, plain UI

The poetry belongs in the world and occasional memorable discovery titles. Controls and instructions are ordinary language: Continue, Begin, I'm back, Stop, See my map. No pep talks, generic wellness coaching, artificial urgency, “Great job,” confetti, XP, levels, badges, glowing gradients, AI sparkles, chat bubbles, or piles of cards.

Stitch was useful for composition, typography, spacing and map texture. It repeatedly invented misleading supporting labels. Product copy is authored and reviewed; do not give a design generator or LLM free control of visible strings.

### The app should disappear during the action

Reach the first concrete step in roughly two minutes and at most three setup screens. No product signup ceremony, introductory carousel, questionnaire baseline, territory catalog, or game-mechanics lesson. The hosting platform's private-site sign-in is separate from onboarding; do not claim the private URL is anonymously accessible.

The active screen should make putting the phone down natural. A timestamp-based timer survives backgrounding. Zero on the timer does not complete an encounter. Return and Stop work immediately.

## 4. The approved first-session contract

**Name → clarify only if needed → combined territory/action setup → act outside Threshold → progressive return → observation → changed map.**

- **Name:** real avoided situation; examples are hints, never prefilled history. The current opening adds an understated Preferences link so optional AI is reachable before any encounter.
- **Clarify:** one tentative interpretation and a correctable resistance choice. A correction must affect the action and territory. Something else is allowed; uncertainty is not a reason to force a category.
- **Setup:** show the concrete, editable action, small duration, and relevant territory together. Restore the 0–10 prediction input that the final screenshot accidentally omitted. No default selection. Zero is a real answer. Begin requires both an action and a prediction. Make it smaller and Adjust the fit remain available.
- **Active:** exact step, timer, I'm back, Stop. Real action happens elsewhere.
- **Return:** actual discomfort first; then avoidance response; then noticing. The screenshot shows the expanded end state, not three questions to display immediately. Noticing is multi-select. “Nothing stood out” is exclusive. Do not require surprise or a positive outcome.
- **Observation:** one encounter supports a modest “this time” claim. Neutral and stopped outcomes have honest copy. Not started adds no route. Never announce a stable pattern after one trial.
- **Map:** actual history dominates. Today's Threshold comes from the behavior engine and describes the next action and duration. Never hard-code “Another Step into The Fog” or “Follow the initial clarity before the doubt returns.” The latter wrongly assumes clarity occurred and teaches acting only while doubt is absent.

Map / Atlas / Me navigation belongs on established-user surfaces; keep it out of the action flow. Atlas holds observations, discoveries and inspectable evidence. Me owns local data controls, installation guidance and optional AI disclosure.

## 5. Visual foundation

The seven latest screenshots are durable local references, already recovered from the original thread:

| Reference | Meaning |
|---|---|
| [01-name.png](references/01-name.png) | Opening and substantial situation field |
| [02-clarify.png](references/02-clarify.png) | Sparse tentative interpretation and correction |
| [03-setup.png](references/03-setup.png) | Combined territory and action; add missing prediction scale |
| [04-active.png](references/04-active.png) | Minimal outside-the-app action state |
| [05-return.png](references/05-return.png) | Expanded reflection; implement progressive reveal and multi-select |
| [06-observation.png](references/06-observation.png) | Modest first observation |
| [07-home.png](references/07-home.png) | Changed personal map; replace fixed recommendation copy |

Preserve warm paper `#FCF9F4`, ink `#20211E`, restrained terracotta `#AC3D24`, Newsreader/editorial serif hierarchy, functional humanist/system sans, fine linework and generous purposeful space. No default Inter-led SaaS aesthetic. Fonts and essential assets are bundled for offline use. Mobile first around 390px, resilient at 320px and enlarged text.

The current map is functional SVG geometry derived from evidence. It is not a finished richly illustrated world or a faithful geographic simulation. Improve its expressiveness within this foundation; do not replace it with analytics, cards, a territory menu, or arbitrary decorative lore.

## 6. Behavioral model and evidence

Situation = concrete avoided thing. Resistance = what makes approach difficult. Expedition = bounded real-world action that interrupts an avoidance move. Encounter = reported attempt. Observation = claim supported by one encounter. Discovery = tentative pattern supported over time. Inhabitant = recurring behavioral move, never anxiety itself or a diagnosis.

| Code | Territory | Meaning |
|---|---|---|
| `fog` | The Fog | Uncertainty; acting before knowing |
| `spotlight` | The Spotlight | Visibility, evaluation, judgment |
| `loop` | The Open Loop | Unnecessary checking, polishing, closure |
| `water` | Still Water | Being with an internal feeling without immediately escaping/fixing |
| `unknown` | Unclassified fallback | Insufficient or different context; no invented territory name |

A task merely feeling unpleasant is not enough to classify Still Water. Conceptual secondary membership is allowed, but current suggestions do not unlock secondary geography. The Friction and inhabitants remain undeveloped concepts, not shipping content.

Current discovery rules are **provisional engineering choices**, not a clinically established standard or an immutable user requirement: examine windows of up to six comparable encounters, require at least four across three local dates, at least three explicit supports and at least 75% support. Not-started encounters are excluded. Stopped encounters can be contrary evidence; they do not support staying/continuing claims. Doorway and carried-discomfort signals are evaluated independently so multi-select is meaningful.

The implementation reconstructs the earliest qualifying discovery from encounter history and retains its establishment history when subsequent evidence becomes mixed. Discoveries are derived objects, not a separately persisted model-authored database. Supporting and contrary encounter IDs remain inspectable. Never count duplicate encounters twice or infer a doorway claim from numeric discomfort difference alone.

## 7. What actually ships in version 3

- Complete local first-use loop, editable actions, explicit prediction, timestamp timer and progressive reflection.
- Map traces from attempted/stopped encounters, stable positions keyed by encounter ID, territory-to-Atlas navigation, evidence-backed discoveries.
- Device-local persistence, export, validated merge/restore, deletion confirmation and another-tab conflict warning. Local records win duplicate-ID collisions; restore preserves this device's drafts and active session.
- Installable PWA shell, bundled assets and offline local behavior. Full physical-device offline verification remains outstanding.
- Optional OpenAI suggestions behind private Sites authentication and a small API Worker.

**Today's Threshold is currently chosen by the local deterministic behavior engine.** It is dynamic from the latest confirmed situation and history; it does not make an LLM call every time Home opens. AI is used when continuing from situation entry or a resistance choice while opted in. Do not describe it as a fully longitudinal AI coach.

The AI receives only the current situation and confirmed resistance enum. It does not receive map history, predictions, reflection text, or the freeform Something else/resistance note. Thus it cannot interpret that note today. These are deliberate data-minimization boundaries and current capability limits, not proof that deeper reasoning is complete.

Model output selects an enum-based template and an exact noun phrase copied from the input. It cannot invent UI titles, observation prose, discoveries or geography. Output is validated; the user's confirmed resistance constrains the schema and wins again after generation. Initial model doses are 1 or 3 minutes. Local history can preserve edited actions and reduce the dose. Invalid/refused/timed-out responses fall back to a user-authored step; offline or AI-disabled use uses the local rules.

## 8. AI choice, privacy, cost and authorization history

The user initially did not realize API use costs extra. That should have been explained before key setup. They considered free Gemini; its unpaid-service data-use terms were a poor fit for personal entries. No Gemini key or integration was created. After receiving an estimate, the user chose to add OpenAI credits and explicitly approved reuse, hosted secret transfer and private publication. **Do not reopen provider choice or repeat setup absent a new reason.** Explain new spending, retention changes or substantially broader data transmission before doing them.

Current model: `gpt-5.4-mini`. The discussed estimate was about $0.30–$0.90/month for five small requests a day, not a subscription or guarantee. One measured synthetic request used 434 input and 54 output tokens, approximately $0.00057 at the then-checked rates. Verify pricing before quoting a new estimate. Do not assume the amount of prepaid credit purchased or whether auto-recharge was enabled; neither was verified.

AI defaults off. Preferences/Me contains explicit versioned consent, costs, limits, and a link to OpenAI data controls. Requests use `store:false`; this does not mean zero retention. API data is not used for training by default, and abuse-monitoring retention can apply, typically up to 30 days with exceptions. Re-check current policy before changing disclosure.

Server limits: 10 requests per UTC day and 150 per UTC month, atomically enforced in D1. Failed provider calls may consume quota. These are cost controls, **not a gameplay quota or an OpenAI billing-account hard cap**. Clearing local data cannot reset server usage.

The key is already saved in ignored `.env.local` and configured as the hosted secret `OPENAI_API_KEY`; `OPENAI_MODEL` is a non-secret hosted setting. Never print keys, inspect secret-bearing files with value-echoing commands, include them in archives, or paste them into the client. Local and hosted configuration are separate. The Platform picker had repeated loading failures, and the user created the key manually; do not send them through that failed loop again. An earlier transfer approach was rejected; a later explicitly approved transfer succeeded. There is no outstanding credential blocker.

## 9. Repository and deployment facts

Canonical repository:
`/Users/alex/Documents/Codex/2026-09-06/referenced-chatgpt-conversation-this-is-an-2/outputs/edge/app`

Parent projectless working directory is not the app repository. Work in the app root. Portable source archive: `../edge-project.zip`. Current release receipt: `../RELEASE_STATUS.md`.

| Item | Value |
|---|---|
| Private URL | https://edge-personal-atlas.thenewdeal.chatgpt.site/ |
| Sites project | `appgprj_6a9e6096f778819182e31639462ded5e` |
| Published version | 3 |
| Published source commit | `4d05c24c51aae0d60f9f832a416a497f9a793ac5` |
| Saved version ID | `appgprj_6a9e6096f778819182e31639462ded5e~appgver_7d83b685cddc819198392df555c80b2d` |
| Successful deployment | `appgdep_6a9f54fbf678819194d2d7463f2e27f7` |
| Hosted environment revision | 1 at publication |
| Access last verified | Owner only, one allowed user, no groups or external visitors |

Documentation commits after the published source commit do not imply a new live app release. Reuse `.openai/hosting.json`; never create a replacement Site or widen its audience to make a test work.

**Version 4 is staged but not published on Sites.** The accessibility and text-resize fixes are committed at `df72c8c`, and a release candidate built from that commit is at `../../work/edge-v4-release.tar.gz`. It was verified to contain no value from `.env.local` (boolean-only comparison, no value printed) and to leave the published migration byte-identical. Publishing to Sites needs the Sites building/hosting skills and Sites-issued transient git credentials, which exist in the owning Codex environment and not in every session; ~~a session without them cannot publish, and must not substitute a direct Wrangler deploy, which would put the Worker outside the trusted dispatcher~~ → **superseded by the September 12 decision above**: a direct Wrangler deploy is now the intended path for Threshold, with its own session-cookie identity replacing the trusted dispatcher. See the Cloudflare deployment block below. This paragraph's Sites-specific facts remain accurate for the Sites deployment, which is untouched and still live.

### Cloudflare deployment (Threshold, direct — not Sites)

A second, parallel deployment alongside the Sites one above, on the owner's existing Cloudflare account (already used for other personal apps; free tier).

| Item | Value |
|---|---|
| Worker name | `threshold` |
| D1 database | `threshold-quota` (binding `DB`) — separate from Sites' `edge-quota`/`site-creator-d1` |
| Auth | Server-side session, not Sites dispatch. See `server/auth.ts`. |
| Session cookie | `threshold_session`, HttpOnly/Secure/SameSite=Lax, 30-day expiry, HMAC-signed with the `SESSION_SECRET` Worker secret |
| URL | **Live:** https://threshold.threshold0.workers.dev |
| Cloudflare account | `Alexmolaei@gmail.com's Account`, id `c952b97aaa50d212f34ab1db0255e38f` |
| D1 database id | `aa8c1cfd-4c8f-4f01-be82-d2abce99cd5d` |
| Deployed | September 13, 2026, from commit `da9d344` |
| Account | One seeded user, `amolaei`. No signup route by design — add more the same way (`scripts/seed-user.mjs`). |

Deployed September 13, 2026: `wrangler login`, `wrangler d1 create threshold-quota`, both migrations applied with `wrangler d1 execute --remote`, one account seeded, `SESSION_SECRET`/`OPENAI_API_KEY`/`OPENAI_MODEL` set via `wrangler secret put`, then `npm run deploy`. Verified live over HTTP: unauthenticated → redirected to `/login`; wrong password → 401; correct password → session cookie set and the app shell loads; a fresh `*.workers.dev` subdomain took about 45 seconds for Cloudflare to finish issuing its TLS certificate before it responded (a one-time propagation delay, not a bug — a 502/TLS-handshake-failure right after first deploy is expected and resolves on its own). The owner confirmed there was no real map data on the Sites-hosted app worth exporting, so migration was skipped.

To seed additional accounts later: `node --experimental-strip-types scripts/seed-user.mjs <username> <password> > seed.sql`, then `wrangler d1 execute threshold-quota --remote --config dist/server/wrangler.json --file=seed.sql`.

Sessions are stateless (signed tokens, no server-side revocation list): `/logout` clears the browser's cookie but does not invalidate that token elsewhere before its 30-day expiry. Acceptable for a single/few-owner private app; would need a revocation table if that threat model ever changes.

Note when packaging: `npm run start` writes local Miniflare state under `dist/server/.wrangler/`, including a local D1 database. The version 3 package shipped that scratch directory. Exclude `.wrangler` when packaging; `dist/server/wrangler.json` is the only Wrangler file that belongs in a release.

Architecture: React 19.2.8 + vinext 1.0.0-beta.9 + Vite 8.2.2. Preserve `package-lock.json` and use its versions. `next.config.ts` intentionally retains `output: 'export'` for the interface. The build then creates a separate small Worker for API requests, serving compiled assets through `ASSETS`. **This is a static interface plus API Worker, not a static-only deployment.** Hosting declares D1 binding `DB`, no `static` stanza. Do not “fix” this by adding static hosting mode or exposing the framework's RSC handler.

File map:
- `app/page.tsx`: screen state machine, opt-in, request integration and recovery controls.
- `app/globals.css`, `app/map-fragment.tsx`: shared design and map rendering.
- `lib/engine.ts`: local recommendations, validators, observations and discovery rules.
- `lib/storage.ts`, `lib/map.ts`: local state/backup validation and evidence projection.
- `lib/suggestions.ts`: consent constants, client response validation, abort/stale-response protection.
- `server/inference.ts`, `server/handler.ts`, `server/transport.ts`: provider schema, reviewed templates, bounded request/response handling and guarded endpoint.
- `server/worker.ts`: request routing, login/logout, and the session gate in front of every route. `server/auth.ts`: password hashing, session signing, login-rate-limiting — the identity layer that replaced Sites dispatch for the Cloudflare deployment. `server/quota.ts`: atomic D1 counters, unchanged.
- `db/schema.ts`, `drizzle/`: quota, `users` and `login_attempts` schema and generated migrations. The Sites-published migration (`0000_*.sql`) is applied history there; never rewrite it. `scripts/seed-user.mjs` creates account rows for the Cloudflare deployment — there is no signup route.
- `scripts/offline.mjs`, `scripts/worker.mjs`: offline asset cache and Worker packaging. Never cache `/api/*`.
- `scripts/evaluate.mjs`: synthetic live evaluation; consumes API credits when run.
- `tests/`: behavioral, persistence, inference, cancellation, quota and Worker boundary checks.

**Sites deployment only:** Sites dispatch supplies `oai-authenticated-user-id`. That Worker must remain behind the trusted dispatcher; do not expose a public workers.dev route for it or accept browser-provided identity as authoritative there. A Sites gate-bypass token is identity-less: 401 from the AI endpoint with that token is expected, and is not evidence the saved API key is broken. **This does not apply to the Cloudflare/Threshold deployment**, which has no Sites dispatcher in front of it by design — its public workers.dev route is intentional, gated instead by the session-cookie login described above.

## 10. What was verified, and what was not

Verified: production build, type checking, 43 automated tests, six final synthetic live examples (proposal, reply, checking, ambiguity, safety-critical checking, explicit correction), packaged Worker root 200 and missing-identity 401, successful private deployment, and one signed-in browser path through opt-in → synthetic situation → model-rendered step → prediction. Zero enabled Begin; missing prediction did not. The browser test did not begin an expedition or record an encounter. Test situation text was cleared and the AI toggle restored to off.

Live evaluation initially exposed incompatible template combinations and a correction failure. Instructions were made explicit and confirmed resistance was constrained in the response schema. The final six passed. Do not weaken validation to make a failing model output look successful. Six examples demonstrate connectivity and bounded behavior, not general reliability or psychological efficacy.

A later browser pass (September 7, 2026 in Los Angeles) walked the **complete local path** end to end against the packaged Worker preview with synthetic data and AI left off: name → clarify → setup → active → return → observation → map, plus Atlas and Me. It confirmed that the timestamp timer resumes at the correct elapsed time after a reload and clamps at `00:00` without recording an encounter, that reflection reveals one question at a time, that "Nothing stood out" is exclusive in both directions, that a stopped encounter produces non-punishing copy and reduces the next dose to one minute, and that a not-started encounter adds no route and no evidence row. Zero console errors or warnings. Layout is clean at 320px and at 200% zoom. The synthetic data was cleared afterwards.

That pass also found and fixed eight defects: seven accessibility (duplicate and missing accessible names on the 0–10 scale, unnamed resistance and urge radiogroups, ungrouped noticing checkboxes, an `aria-label` on a role-less timer, a decorative dot read aloud) and one visual (the two data controls on Me rendered with no gap, reading as a single underlined string). The scale's end captions were also visually wrong below 500px, where the control wraps to six columns; each end now names its own number. [VALIDATION.md](VALIDATION.md) lists these individually. No screen was recomposed and no copy principle changed.

Still unverified: the signed-in **AI-enabled** journey past the prediction step, physical iOS/Android installation and offline relaunch, real background/lock-screen timer behavior, a pass with actual screen-reader software, broad cultural/linguistic/action coverage, and longitudinal usefulness. The source has automated coverage for many of these rules, but that is not physical-device verification, and an accessibility-tree inspection is not a screen-reader user's experience.

A second pass the same day then did the text-resize work: every `font-size` moved from `px` to `rem`, so the app finally responds to a browser text-size preference at all, and the five things that enlarged text broke were fixed (clipped action textarea, a timer circle that no longer contained its digits, headings overflowing on a single long serif word, a fixed nav clearance that would have buried the end of Map/Atlas/Me, and the scale's column-count breakpoint). Map text and 44px touch targets stayed in `px` deliberately; [VALIDATION.md](VALIDATION.md) records why. Verified at a doubled root font size across all nine surfaces, and unchanged at normal size, 320px, and the 195px equivalent of 200% zoom.

A third pass scrutinised the **map** itself, which had never been rendered by a test: the runner has no DOM, so only `projectMap()` was covered, by two assertions comparing its output against itself. Measuring the geometry over the full reachable range of every hash seed found that the map was asserting things that were not true. Endpoints were displaced below their anchors and landed outside their own terrain; Still Water landed on the route origin, so an encounter there looked like one that never left home; Unknown endpoints were painted over by the Spotlight label's opaque plate; established discoveries replayed their reveal animation on every observation; the texture saturated after 20-30 encounters; repeated encounters drew parallel strands rather than the specified line continuity; and the compact setup preview cropped away everything below y 343, which for Still Water left a label and nothing else.

All are fixed. **This relocated existing routes once**, which the user accepted explicitly: the endpoint formula was wrong, so correcting it has to move them. This is a deliberate one-time correction, not the random per-render drift the vision forbids, and positions remain a pure function of the encounter id. Continuity is now a shared per-territory gate that routes overlay into a darkening trunk, which needs no sibling awareness, so no route's geometry depends on the history around it. A **golden-coordinate test now pins the exact numbers**, which nothing did before; without it a change to the hash or the layout would relocate a person's whole history with every structural test still green. Map coverage went from 2 assertions to 11 tests.

The browser pass then caught two things the numeric work had missed, both worth remembering: the "stopped here" note printed straight through The Spotlight, because the tests checked marks against labels but never the note; and the label extents those tests used were guessed rather than measured, and wrong in both directions. Ink extents are now measured from the rendered SVG and exported from `lib/map.ts` so the placement code and the tests share one source. They are constants tied to the current font and territory names, so remeasure them if either changes. Full detail in [VALIDATION.md](VALIDATION.md).

Two candidate defects were investigated and **rejected**, both screenshot artifacts rather than real: the bottom nav appearing to clip the "I'm avoiding something" row (measured 40px of clearance once scrolled), and an off-centre dot in the selected radio (measured concentric with its ring to a tenth of a pixel). Measure before believing a full-page capture of a `position: fixed` layout.

Last audit: zero production dependency vulnerabilities; four moderate advisories remain in Drizzle's legacy development dependency chain. That development server is neither used nor deployed. Re-audit when dependencies change; do not force a breaking downgrade to eliminate a tooling-only report.

## 11. Next work, in priority order

The previous top two priorities (visual review, and browser/accessibility validation) are **done for the local path**, including the `rem` conversion. What remains of them is listed first because it is still the nearest gap.

1. ~~Finish the validation started on September 7: the signed-in AI-enabled journey past the prediction step, and physical-device installation, offline relaunch and background-timer behavior.~~ → **Offline relaunch and background-timer behavior are done** (September 15, 2026, via Playwright network-emulation rather than a physical device — see below for a real bug this found and fixed). The signed-in AI-enabled journey past the prediction step and true physical-device installation remain outstanding. ~~a pass with real screen-reader software, a real browser font-size setting to confirm the `em` breakpoint~~ → dropped per the September 15 decision above; accessibility is no longer in scope. Use synthetic data or an isolated test state; never fabricate meaningful approach in the user's actual map. Preserve user drafts and preferences. Browser testing was explicitly authorized in that task; do not infer blanket authority to alter unrelated user data.

   **September 15, 2026 finding:** the service worker was silently failing to install on every load. `scripts/offline.mjs` walked `dist/client` for its cache manifest and picked up Cloudflare's own non-public build-config files (`_headers`, `.assetsignore`, `.vite/manifest.json`), which 404 when actually fetched. `cache.addAll()` is all-or-nothing, so those three 404s failed the entire `install` event, and a failed install makes the browser discard the registration outright — it briefly registered, then vanished within ~400ms, with zero console error. Fixed by excluding dotfiles/dot-directories and the two known Cloudflare root filenames (`_headers`, `_redirects`) from the walk, while keeping real build output (`_next/static/*`, underscore-prefixed but legitimate) cached. Rebuilt (21 assets, down from 24), redeployed, and confirmed live: the registration now stays `active` continuously rather than disappearing, and the app's shell fully loads with all network requests blocked (Playwright's own `context.setOffline()` CDP emulation turned out to block the top-level navigation before the service worker gets a chance to intercept it — a quirk of that specific automation API, not a real-world offline failure mode; blocking requests via `page.route()` instead is the faithful proxy and is what actually confirmed the fix). Manifest and background-timer wall-clock math (`lib/engine.ts`'s `remaining()`) were also checked and are correct as designed — no other bug found in either.
2. Sites publish: the owner has published from the Sites session since this was last updated; confirm the exact live version/commit there rather than trusting this document's older facts table before relying on it. The Cloudflare/Threshold deployment described in section 9 is done and live as of September 13, 2026.
3. Broaden the behavioral evaluation set and action library: ambiguity, negation, unfamiliar tasks, user corrections, high-stakes boundaries and awkward copied noun phrases. Check usefulness, not merely valid JSON. Evaluate local and AI paths separately. Keep all action copy editable. The local-path safety-critical gap (below) is fixed; still open is broader coverage of the other categories in this list.
4. Observe real use: does the next action fit, does the user leave the app, does return feel quick, and does the map make the encounter worth remembering? Tune provisional thresholds from evidence rather than presenting them as science.
5. Consider richer authored map changes, inhabitants, and sync only as explicit subsequent scope. Sync needs a product/data/consent design and conflict handling. D1 quota storage is not already a cloud Atlas. ~~Do not add a login wizard just because a database exists.~~ → **superseded**: a login now exists, added deliberately for the September 12 Cloudflare-deployment decision (section 9), not speculatively. The caution still applies to inventing further account features (signup, password reset, multi-user roles) without an explicit reason.

Do not fill the backlog with reminders, streaks, feeds, badges, territory levels, wellness metrics, generic AI chat, or premium screens. The current personal test is private; a public release requires separate audience approval and the outstanding release checks.

## 12. Practical resume notes

For the Sites deployment: use the installed Sites building/hosting skills for this repository; their current instructions govern that hosting, and only the owning agent edits/publishes there. For the Cloudflare/Threshold deployment: use `wrangler` directly (`npm run deploy`, `npm run db:migrate`) with the owner's own Cloudflare credentials — see section 9. Neither needs a new task, subagent, Site, worktree or provider setup merely to resume.

Use Node >=22.13; the bundled working runtime is `/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`. The default system Node was too old. Prefix its directory on PATH. Commands: `npm test`, `npx --no-install tsc --noEmit`, `npm run build`. Do not repeatedly rerun paid evaluations or broad checks without a change or unresolved concern.

For npm use `--cache /tmp/edge-npm-cache` if the default cache has permission problems. For local packaged Worker preview use `npm run start` with `XDG_CONFIG_HOME="$PWD/.wrangler/config"`, `MINIFLARE_REGISTRY_PATH="$PWD/.wrangler/registry"`, `WRANGLER_LOG_PATH='.wrangler/logs'`, and `WRANGLER_SEND_METRICS=false`. This avoids writing to restricted home-directory preferences. Read the printed URL; do not scan ports. No preview server was intentionally left running at handoff.

Network grants expire by turn. Request only needed access; do not disable TLS verification. A public system-certificate bundle used successfully for Node/Git is in the parent workspace's `work/system-certificates.pem`. For Node use NODE_EXTRA_CA_CERTS; for Git use per-command http.sslCAInfo. Refresh source credentials through Sites, never persist tokens in remotes/config or expose them. An earlier large push needed http.postBuffer=524288000.

For publication: validate the changed behavior, build, commit exact source, push with fresh transient credentials, read full HEAD SHA, package with the Sites helper, save a version, verify current audience, deploy privately, and wait for success. Preserve the current browser tab rather than multiplying tabs. The original deployment thumbnail is not evidence of fresh visual QA.

User preference: act autonomously within approved scope, communicate plainly, and explain real blockers. Do not repeatedly ask for permissions already granted. State what changed, what was tested, and what remains uncertain. Discuss costs before expanding paid usage. Never claim “ready” based solely on an attractive screenshot or a successful deployment.

## Suggested cold-start instruction

> Continue Threshold from HANDOFF.md in the existing repository. Preserve the locked product vision and latest Stitch foundation. First report the current live state and the highest-priority remaining verification or behavior-quality gap, then complete a coherent batch within that scope. Do not restart setup, reopen settled design/provider decisions, add new game mechanics, or treat unverified capabilities as complete. Keep the app private and protect existing user data and credentials.
