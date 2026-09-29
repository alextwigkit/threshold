# Threshold: UX contract

Threshold helps someone approach something they've been avoiding: a step of a
few minutes, compared against what they expected and what they were worried
about. This document describes the app as it now is, after a full usability
rethink that replaced the original metaphor-heavy interface. Read
[HANDOFF.md](HANDOFF.md) for release status and verification boundaries.

## Vocabulary

One plain word per concept, everywhere in the UI: step, history, pattern.
"Threshold" appears only as the app's name. Internal metadata words never
appear in UI copy: territory, encounter, observation, discovery, atlas,
trail, stone, expedition, and the territory names (Fog, Spotlight, Open Loop,
Still Water). Those words still live in code identifiers, storage and screen
ids for compatibility; they are never rendered to the user.

## Copy conventions

Headings are in sentence case. Buttons say verb plus object ("Download a
backup", not "Export"). Instructions sit outside input fields, never inside
them; placeholders only give an example, prefixed "For example:". A step's
own reason for being hard (the why line) is said once, at the moment of
deciding, never as a clinical label.

## Screens

Each screen has one job. Tier 1 is the element that answers that job; tier 2
supports it; everything else is background.

1. **Start** (`name`): pick what to work on. Tier 1: the question and the
   textarea. Tier 2: Continue. Returning users see recent situations as
   choices under the field. Primary action: Continue.
2. **What makes it hard** (`clarify`, conditional): narrow down the reason.
   Tier 1: the five choices. Primary action: Continue.
3. **Your step** (first half of `setup`): read and, if needed, edit the step.
   Tier 1: the step text, editable, in the largest type on the screen. Tier
   2: the why line under it, or a hint above the field when the step is
   blank. Primary action: Next.
4. **Before you start** (second half of `setup`): predict and name a worry.
   Tier 1: the 0-10 discomfort scale. Tier 2: the worry field. The step and
   its duration show as one quiet reminder line. Primary action: Start
   timer.
5. **Timer** (`active`): do the step. Tier 1: the time, in a ring that empties
   as it runs out. Tier 2: "I'm done". "I stopped partway" and "I didn't
   start" are also reachable without scrolling. A late return (more than 30
   minutes after time was up) replaces the ring with a sentence asking how
   it went.
6. **How it went** (`return`): report the outcome. Tier 1: the current
   question (discomfort, then urge, then the worry check, then noticing),
   revealed one at a time. Answered questions collapse into a summary row.
   Primary action: Continue (or Skip until something is chosen).
7. **Result** (`observation`): see what happened. Tier 1: the comparison
   heading ("Easier than you expected", an outcome like "You stopped
   partway", or a new pattern's heading). Tier 2: the supporting line
   underneath (the expected/felt numbers, the pattern's evidence, or the
   next-step line). The row of dots stays, muted, above the heading. Primary
   action: Done (kept secondary, since it only dismisses).
8. **Home** (`map`): decide what to do next. Tier 1: the next step, with its
   duration and situation, then Start. Tier 2: "Your progress", the easier-
   than-expected and worry sentences, and the row of dots. Primary action:
   Start.
9. **History** (`atlas`): review what came before. Tier 1: patterns, when any
   exist, each with its evidence stated in words. Tier 2: steps grouped by
   situation, newest first, newest group open. Primary action: none; this is
   a review screen. Empty state offers "Start with something you're
   avoiding".
10. **Your data** (`me`): manage local data. Tier 1: "Download a backup".
    Tier 2: "Restore a backup", "Delete all data", and the privacy line
    about what is sent to the AI service. Primary action: Download a backup.

## Recovery and accessibility

Storage failure must be visible; never imply a saved record if writing
failed. Preserve usable in-memory state and allow export. Invalid imported or
stored data cannot crash launch. Focus moves to the new screen's heading on
navigation. Touch targets are 44px where possible. Reduced motion removes the
dot settle animation. The offline shell loads all essential assets. The
timer, the reflection draft and the worry draft all restore after a reload.

## Backup, restore and history

Your data offers Restore a backup next to Download a backup. A restored file
is parsed and validated locally before a confirmation summarizes steps to add
and duplicates to skip. Merging never deletes local records or replaces the
current draft or an active timer; local copies win id conflicts. Unsupported,
corrupt or oversized files leave existing data untouched. A restore is not
counted as a new real-world step.

A step left with an unanswered worry ("can't tell yet") can be given a later
answer from its History entry, with three plain buttons (No, Partly, Yes),
not a radio group. This is the one narrow exception to a step's otherwise
immutable record. A later answer never counts toward a pattern; only the
answer given on How it went does, so answering later can't create or move
one.
