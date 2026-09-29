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

## Safety: `needsCare` and `careful`

`needsCare(situation)` matches a conservative, high-signal list (self-harm,
abuse, medical, legal and financial crisis phrases), biased toward
under-catching. `candidate()` sets `careful: true` whenever it matches, so
Your step shows no why line, and the hint above the field is the fixed
`careHint` ("Choose a step that feels safe and manageable. It's fine to get
advice or support first.") instead of a resistance-keyed one.

## Step selection and calibration

A valid step has an observable action, a bounded duration (1 to 3 minutes, 1
when calibration calls for a smaller dose), and relevance to the situation.
`candidate()` derives the territory, then a template keyed by situation
keywords (writing, message, question, conversation), then a smaller dose
when the last matching encounter was stopped, not started, or scored 8 or
higher. A user's own edited action (`userAction`) is preserved across visits
and outranks the template. Home's next step and the built-in fallback both
call the same `candidate()`.

## AI failure falls back to the built-in engine, not a blank step

When the suggestion request throws, hits the daily limit, or the server
returns `source: 'local'`, the client runs `infer()` (or the confirmed
resistance from Clarify) and then `candidate()`, exactly as the fully
offline path does. A blank step now only happens if `candidate()` itself
produces one. "Use a standard step instead," shown mid-request, takes the
same route.

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
