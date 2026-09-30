# Threshold

A private, offline-capable, mobile-first PWA that helps one person approach
something meaningful they habitually avoid: name the situation, take a small
real-world step, predict how it will feel, then compare that with what
actually happened. Over enough steps it surfaces patterns.

Live at [threshold.threshold0.workers.dev](https://threshold.threshold0.workers.dev/),
behind a username/password login. **Start with [HANDOFF.md](HANDOFF.md)** for
release state, deployment facts and what was verified.

## Product decisions

These are settled. Change them only on an explicit decision by the owner,
and record the change here and in the owning doc.

**What the app rewards**
- The goal is acting while resistance is present, never feeling better, time
  in the app, or finishing a timer. An attempted step counts even when it was
  uncomfortable or stopped partway; a stop is an honest half-filled mark, not
  a failure. No points, streaks, levels, quotas or default notifications.
  ([PRODUCT.md](PRODUCT.md))
- Not a therapy, diagnosis, task manager, chat assistant or curriculum. Never
  encourage unsafe action or skipping a necessary safety check.

**Words**
- Plain interface: the person sees "step", "history" and "pattern". The
  original threshold, territory, trail and atlas metaphor lives only in code
  identifiers and storage fields, for compatibility. ([UX.md](UX.md))
- A worry named before a step is the person's own claim and is checked
  afterwards; it is a sharper test than the 0 to 10 guess.

**Suggestions (AI)**
- Always on when online (September 12 decision); no opt-in toggle. Only the
  situation and the chosen reason are sent, server-side, to OpenAI. History
  and reflections never leave the device.
  ([INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md))
- The model picks from reviewed templates. A benign mismatch in its answer is
  repaired to sensible defaults rather than rejected; if the request fails,
  the app uses its own built-in step, never a blank one.
  ([BEHAVIOR_ENGINE.md](BEHAVIOR_ENGINE.md))
- Sensitive situations (medical, legal or financial decisions, self-harm,
  abuse, coercion, danger, safety-critical checks) get no suggested step and
  no push to act; the person writes their own, with a hint to get support.
  Ordinary tasks must not be routed there.

**Duration and timer**
- A step's minutes are the only source of its duration; step text never
  states one. Choices are 1, 3, 5 or 10 minutes, plus any duration the person
  types (up to 30). The last choice carries forward, except after a stopped,
  skipped or very hard step, which drops to 1 minute.
- The timer counts past 0:00 instead of stopping.

**Evidence and patterns**
- One step supports only a small observation. A pattern needs at least four
  comparable steps across three different days, with at least 75% support,
  and shows its evidence, including mixed evidence.
- A worry answered later from History never counts toward the worry pattern,
  so answering favourably after the fact can't inflate it.

**Data**
- All history is stored in the browser only, per origin. No sync or accounts
  beyond the login gate. Your data offers backup download, reviewed restore
  and deletion. D1 holds only API quota counters and login records.

**Design** ([DESIGN.md](DESIGN.md))
- Six type roles as tokens (Display, Title, Lead, Heading, Body, Meta); serif
  only for headings; no uppercase or letter-spacing; weight 500 only on
  buttons and chips.
- One focal element per screen and one filled button. The primary action is
  visible without scrolling at 390x844, and at 375x667 wherever the content
  allows. It is never pinned over content: a pinned button overlapped fields
  on a real phone.
- Visual changes are checked by a fresh reviewer on sharp and blurred mobile
  screenshots before they ship.
- Design passes may depart from UX.md; update the doc afterwards.

**Open question:** the dots on Home and Result all look the same, so they
don't yet show how hard each step felt or which one is the latest.

## Development

Requires Node 22.13 or newer. Preserve the lockfile: `npm ci`, then
`npm run dev`. Check with `npm test` and `npx --no-install tsc --noEmit`. Add
tests only where a regression would be costly and silent (safety routing,
data loss, judgment repair).

`npm run build` creates the static interface in `dist/client`, its offline
service worker, and the separate API Worker. **Set `THRESHOLD_DB_ID`** to the
D1 id recorded in HANDOFF.md when building for deployment; without it the
deploy fails. Then `npm run deploy`. `npm run start` previews the packaged
Worker locally. The service worker registers only in production.

Device data belongs to its origin, so local and hosted copies have separate
histories; move data with backup and restore.
