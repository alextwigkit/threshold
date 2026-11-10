# Threshold: product

Read [HANDOFF.md](HANDOFF.md) for release status and verification
boundaries. Sections describing the initial build are historical where
explicitly labeled.

## Purpose

Threshold helps a person get to know the resistance that comes up around
things that matter to them, the way a player gets to know a hard opponent's
moves. Success means meeting resistance with curiosity: noticing it, and
sometimes acting while it's present. It never means feeling better or
completing a timer (November 9, 2026 decision; it was "acting with
resistance present").

## Core loop

The first focus is in-the-moment urges and reluctance. Notice resistance,
write down what's happening and, optionally, what it's saying, and see
whether you've met that line before. After a "just now" entry, optionally
guess what the urge will do and watch it for a minute, or name the smallest
thing you'd try.

The planned-step loop remains: name a current situation, say what makes it
hard, choose a small real-world step, predict how uncomfortable it will be
and name a worry, attempt it outside Threshold, record what happened, and
see the result: how it compared to what was expected and whether the worry
happened. Over enough steps the app surfaces a pattern.

## Naming: internal only

The original design used a threshold/territory/trail/atlas metaphor
throughout the interface. That metaphor never appears in UI copy now; a
usability rethink replaced it with three plain words: step, history and
pattern (see [UX.md](UX.md) for the vocabulary rules). It still exists as
code identifiers, storage field names and screen ids, kept as-is for
compatibility. Internal terms below (territory, encounter, discovery)
describe implementation, not anything the person sees; where this document
quotes user-facing copy, it uses the current wording.

## Domain

- Situation: the user's concrete avoided thing and current context.
- Resistance: their confirmed account of what makes a step difficult.
- Territory: a reusable resistance family, internal only; the user instead
  sees a plain phrase like "were worried how someone would react."
- Encounter (a step in the user's history): an immutable attempt record with
  prediction, actual discomfort, behavior and noticing. A timer alone is not
  evidence. The one exception: a worry left unanswered ("can't tell yet")
  can later be given an answer from History.
- Worry: a concrete, person-worded guess named before the step and checked
  afterward, sharper than a 0-10 guess since it is the person's own claim.
- Purpose: the person's own reason for the step, named once and carried
  forward for the same situation, shown at the moment the step is presented.
- Moment (a noticed entry): a short record of resistance, acted on or not:
  what was happening, optionally what the resistance said, and when it was
  noticed, with the optional follow-ups (a guess and what the urge did in a
  watched minute; the smallest thing to try, and whether it was tried). It is
  separate from steps and never counts toward a pattern.
- Pattern (internal name: discovery): a tentative repeated finding with
  inspectable supporting and contrary evidence, stated in words.

## First implementation scope

A mobile-first installable PWA: real situation entry, optional
clarification, an editable step, prediction and worry, a resumable timer,
progressive reflection, an evidence-grounded result, a persistent history
and pattern list, and device data controls. Device-local storage is
described plainly in Your data. The app works after initial loading without
a network connection.

The engine uses controlled templates and explicit user choices; it must not
pretend to infer a psychological truth from keyword matches, and the user
can correct or replace any suggestion. Optional AI, when reachable, suggests
a step; history and reflections stay local. If the request fails or is
unavailable, the app falls back to its own built-in step rather than a blank
one.

## Reward rules

A noticed moment is acknowledged by saying whether its line has been met
before; it is never scored. An attempted step adds to the history even when
uncomfortable or unfinished. Stopping produces an honest half-filled mark,
never a failure badge. Merely opening the app, waiting, or starting the
timer adds nothing. No points, streaks, levels, leaderboards, gameplay
quotas, or default notifications.

## Scope boundaries

No diagnostic claims, treatment promises, social feed, chat assistant,
productivity task manager, forced exposure, or prescribed curriculum. Never
encourage unsafe action or removing a necessary safety check. Sensitive
situations get no why line and no push to act: the step field is left to the
user, with a hint to seek advice or support first.

## Product acceptance

- A new user can reach a concrete, editable step in at most three screens,
  generally under two minutes.
- Returning early, stopping, staying uncomfortable, and noticing nothing all
  have complete paths; user data survives reload, and the timer correctly
  resumes after backgrounding.
- Home's next step uses situation and history, not a fixed sequence, and
  History shows the evidence behind a pattern, including mixed evidence.
- The empty state contains no pretend history. All core interactions work
  with keyboard, touch, screen reader and reduced motion.

## Deferred release work

Secure cross-device identity and sync, broader model evaluation, richer
evidence-linked history views, and physical-device install and offline
testing.
