# Threshold: behavior engine

Read [HANDOFF.md](HANDOFF.md) for release status and verification
boundaries. See [PRODUCT.md](PRODUCT.md) for why the territory metaphor is
internal only; this document checks its claims against `lib/engine.ts`.

## Governing rule

The engine reasons; the product speaks. Keep interpretation, step selection
and evidence evaluation separate from rendering. Never optimize for
discomfort reduction, time in app, or forced progression. Pipeline:
situation, resistance, territory (internal), a small candidate step,
prediction and worry, an encounter, then repeated evidence toward a pattern.

## Territories: internal, and only a `where` phrase

`territories` no longer carries a name, short label or description; each
entry is just `{ where }`, a plain phrase used only inside a pattern's scope
line, never as a heading or title:

- fog: "weren't sure how to begin"
- spotlight: "were worried how someone would react"
- loop: "kept checking or preparing"
- water: "were avoiding a feeling"
- unknown: "found it hard for another reason"

The territory ids and routing are unchanged internally; a situation keeps
whatever territory it was last classified as. None of this, including the
ids "fog", "spotlight", "loop" and "water", is ever shown to the user.

## Clarification

Skip only for a concrete action and unambiguous resistance. Otherwise ask
the single approved clarification: wanting to understand, not knowing the
first step, worry about others' reaction, wanting to keep checking, or
something else. The user can always correct this on Your step.

## Safety: `needsCare`, `needs_user_step` and `careful`

`needsCare(situation)` matches a conservative, high-signal list (self-harm,
abuse, medical, legal and financial crisis phrases), biased toward
under-catching. On the model path, the judgment's `eligibility` field can
independently flag `needs_user_step`, reserved for a similarly narrow set:
medical, legal or financial decisions, self-harm, abuse, coercion, danger or
safety-critical checks, never an
ordinary task, even one the model can't ground a template for. `careful` is
`needsCare(situation) || needs_user_step`: whichever one fires, Your step
shows no why line, and the hint above the field is the fixed `careHint`
("Choose a step that feels safe and manageable. It's fine to get advice or
support first.") instead of a resistance-keyed one.

## Step selection and calibration

A valid step has an observable action and relevance to the situation; no
action text, built-in or template, ever states a duration (see Duration,
below, for where minutes come from). `candidate()` derives the territory,
then a template keyed by situation keywords (writing, message, question,
conversation), then a smaller dose when the last matching encounter was
stopped, not started, or scored 8 or higher. A user's own edited action
(`userAction`) is preserved across visits and outranks the template. Home's
next step and the built-in fallback both call the same `candidate()`.

## Duration: carried minutes, chips, and the count-up timer

`minutes` is the only source of a step's duration; it is never stated inside
action text. `candidate()` carries the last matching encounter's minutes
forward when finite, greater than 0 and at most 30, and otherwise defaults
to 3; calibration's smaller dose overrides that to 1. The device owns
minutes on the AI path too: a model suggestion's action text comes from its
template, but its minutes come from the local `candidate()`, except
`model-notice-v1`, which always stays 1. `statedMinutes()` in
`lib/duration.ts` reads a duration only out of step text the person actually
typed (seconds round up to 1 minute, capped at 30; a known, accepted false
positive reads a step text like "the 90s playlist" as 90 seconds). Your
step's duration field offers chips for 1, 3, 5 and 10 minutes, plus an extra
chip when the draft already holds some other typed value. The timer counts
down to 0:00, then keeps counting up instead of stopping there.

## Judgment repair, not rejection

`parseJudgment()` still rejects a judgment that fails schema validation,
that names `ungrounded_object` (the free object slot wasn't copied from the
situation), or that returns `correction_overridden` (the model's resistance
disagrees with a resistance the user already confirmed). Everything else, a
benign mismatch between resistance, primary territory and template that the
schema allows individually but that don't cohere together, is repaired to
that resistance's defaults instead of thrown away: primary falls back to
`primaryDefaults[resistance]` when it isn't in `primaryAllowed[resistance]`,
template falls back through `templateDefaults` (or `own_step`) when it
doesn't list that resistance, secondary drops the primary and `unknown`, and
`own_step`'s object is cleared. Repair is idempotent: repairing an
already-repaired judgment returns it unchanged. `begin` is the template for
doing the first part of an ordinary task or activity (going to the gym,
cleaning the kitchen); it's allowed for `understand`, `start` and `other`,
and is what those three repair to by default.

Only the error's code, never the situation or any provider content, is ever
logged: the server's fallback path logs the thrown error's message and
nothing else.

## AI failure falls back to the built-in engine, not a blank step

When the suggestion request throws, hits the daily limit, or the server
returns `source: 'local'`, the client runs `infer()` (or the confirmed
resistance from Clarify) and then `candidate()`, exactly as the fully
offline path does. When the model does return but leaves the action blank
and the step isn't `careful`, the client substitutes that same local
`candidate()` step rather than leaving the field empty; a blank, careful
step (`own_step`, or `needs_user_step`) is left for the person to write.
"Use a standard step instead," shown mid-request, takes the same route.

## Encounter storage

An encounter has prediction, an optional worry and its Return answer,
outcome (attempted, stopped, not_started), actual discomfort (0 to 10, or
null for not_started) and noticing codes. It is otherwise immutable, apart
from a worry answered "unknown" on Return, which can be given a later answer
from History. Encounters are saved idempotently by id.

## Result copy: `compare()` and `observation()`

`compare(e)` turns the prediction/actual gap into one of five headings
("Easier than you expected" down to "Harder than you expected", or "About
what you expected" when equal), plus "Expected N, felt M". `observation(e,
next)` returns that heading for a completed attempt, or "You stopped
partway" / "You didn't start this time" otherwise, paired with
`nextStepLine()`, which only claims the next step is shorter when
`candidate()` would actually return fewer minutes than this one had.

## Pattern policy

`discoveries()` scans sliding windows of up to six comparable attempted or
stopped encounters per territory, requiring at least four encounters across
at least three distinct dates, at least three supporting encounters, and at
least 75% support. Three rules: doorway (starting felt harder than
continuing), carried (kept going while uncomfortable), and bluff (a named
worry, answered on Return only, that mostly didn't come true; a later
History answer never counts, so answering favorable outcomes later can't
inflate its evidence). `patternEvidence()` states the scope in plain words
using each territory's `where` phrase (or "found out" for bluff), never the
territory name. Mixed evidence past the qualifying window keeps the pattern
with a note that recent steps are mixed, rather than withdrawing it.
