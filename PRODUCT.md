# Threshold — product

> September 12 decision: the owner explicitly requested removing the AI suggestions section and making suggestions always on. Situation/resistance continuation now requests the existing model automatically when online, including on fresh browsers and after local data deletion. The old consent preference is no longer read. Existing minimal payload, API limits, validation and offline fallback remain. Earlier default-off/toggle instructions below are historical and superseded. This authorization applies to the current private personal app.

Current release: private version 3, including optional AI. Read [HANDOFF.md](HANDOFF.md) for current status, decision precedence and verification boundaries. Sections describing the initial build are historical where explicitly labeled.

## Purpose

Threshold helps a person approach something meaningful they habitually avoid. A real attempt adds a stone to their trail; evidence from attempts can become useful discoveries. Success means acting with resistance present, not feeling better, completing a timer, or spending more time in Threshold.

## Core loop

Name a current situation → identify resistance and avoidance move → choose a small real-world action → predict discomfort → attempt it outside Threshold → record what happened → retain an observation and add a stone to the trail → offer a relevant next action.

## Domain

- Situation: user's concrete avoided thing and current context.
- Resistance: their confirmed account of what makes approach difficult.
- Territory: a reusable resistance family; primary and optional secondary membership, with unknown allowed.
- Expedition: bounded action, duration, approach target, optional avoidance constraint and user edits.
- Encounter: immutable attempt record including prediction, actual discomfort, behavior and noticing. A timer alone is not evidence. The one exception: a worry left unanswered on Return ("can't tell yet") can later be given an answer from the Atlas.
- Worry: a concrete, person-worded guess named on Setup ("what if they say no", "call your own bluff") and checked on Return. Sharper than a 0–10 guess because it is the person's own claim being tested, not a number.
- Purpose: the person's own reason for the step ("the lifeguard goes in because the kid is right there"), named on Setup and carried forward for the same situation. Shown at the doorway, where resistance peaks, not just recorded afterward.
- Observation: scoped claim supported by an encounter; may be neutral.
- Discovery: tentative repeated pattern with inspectable supporting and counterevidence.
- Inhabitant: recurring behavioral move, never a diagnosis, emotion-monster, coach or mascot.

## First implementation scope

A mobile-first installable PWA: real situation entry, optional clarification, editable expedition, prediction, resumable active session, progressive reflection, evidence-grounded observation, persistent personal trail, Atlas evidence and device data controls. Device-local storage must be clearly described in Me. No product-account onboarding is added; the privately hosted Site requires platform sign-in. The app must work after initial loading without a network connection.

The initial engine uses controlled templates and explicit user choices. It must not pretend to infer a psychological truth from keyword matches. Users can correct every suggestion and name their own action. In version 3, explicit optional consent enables a server-side model request for the current situation and resistance choice; history and reflections remain local.

## Reward rules

Attempted approach adds a stone even when uncomfortable or unfinished. Stopping produces an honest half-filled stone; never a failure badge or punishment. Merely opening the app, waiting, or tapping Begin cannot add a stone. Equal or greater actual discomfort can still support meaningful learning. No points, streaks, levels, leaderboards, gameplay quotas, notifications by default, or territory completion percentages. Separate server request limits control API costs.

## Scope boundaries

No diagnostic claims, treatment promises, social feed, chat assistant, productivity task manager, forced exposure, premium gates, fabricated geography measurements or prescribed curriculum. Never encourage unsafe actions or removal of necessary safety checks. Respect a person's decision to stop or decline. Specific safeguards for a later model service require separate evaluation before launch.

## Product acceptance

- A new user can reach a concrete, editable action in at most three screens, generally under two minutes.
- Returning early, stopping, staying uncomfortable, and noticing nothing all have complete paths.
- User data survives reload and the timer correctly resumes after backgrounding.
- Home recommendations use situation and encounter history; no fixed Fog sequence.
- Atlas shows the evidence behind claims, including mixed evidence.
- Empty state contains no pretend user history. Unknown territories remain unnamed.
- All core interactions work with keyboard, touch, screen reader and reduced motion.

## Deferred release work

Secure cross-device identity and sync, broader model evaluation and expedition library, longitudinal discovery evaluation, richer evidence-linked trail views and inhabitants, user research and physical-device install/offline accessibility testing. These are release work, not grounds to improvise additional onboarding.

## September 7 integration update

Optional AI suggestions preserve the approved screens and first-use flow. The current contract, privacy disclosure, bounded request limits and validation status are recorded in [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md). AI remains off until the user opts in; observations, discoveries and trail evidence remain local and deterministic.
