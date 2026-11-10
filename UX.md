# Threshold: UX contract

Threshold helps someone get to know the resistance that comes up around
things that matter: noticing it as it happens or afterwards, and sometimes a
step of a few minutes, compared against what they expected and what they
were worried about. This document describes the app as it now is, after a
full usability rethink that replaced the original metaphor-heavy interface.
Read [HANDOFF.md](HANDOFF.md) for release status and verification
boundaries.

## Vocabulary

One plain word per concept, everywhere in the UI: step, history, pattern.
Noticed moments speak of what the resistance is "saying" and its "usual
lines", so a repeat can be recognised ("You've met this one before").
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
   blank, then "How many minutes?" as chips of 1, 3, 5 and 10, plus an extra
   chip when the person has typed another length in the step itself (up to
   30); the last length chosen carries forward to the next step. Primary
   action: Next.
4. **Before you start** (second half of `setup`): predict and name a worry.
   Tier 1: the 0-10 discomfort scale. Tier 2: the worry field. The step and
   its duration show as one quiet reminder line. Primary action: Start
   timer.
5. **Timer** (`active`): do the step. Tier 1: the time, in a ring that
   empties as it runs out, then counts up past 0:00 with "Time's up. Keep
   going if you like, and tap “I’m done” when you finish." The hint above
   the buttons opens with "Notice what the resistance does as you go." Tier
   2: "I'm done". "I stopped partway" and "I didn't start" are also
   reachable without scrolling at 390x844 (at 375x667, "I didn't start" sits
   just below the fold). A late return (more than 30 minutes after time was
   up) replaces the ring with a sentence asking how it went.
6. **How it went** (`return`): report the outcome. Tier 1: the current
   question (discomfort, then urge, then the worry check, then noticing),
   revealed one at a time. Answered questions collapse into a summary row.
   Primary action: Continue (or Skip until something is chosen).
7. **Result** (`observation`): see what happened. Tier 1: the comparison
   heading ("Easier than you expected", an outcome like "You stopped
   partway", or a new pattern's heading). Tier 2: the supporting line
   underneath (the expected/felt numbers, the pattern's evidence, or the
   next-step line). A Meta line says how long the step took ("Took 4 min
   20 sec", or "Stopped after ..."); it is omitted when the person came back
   more than 30 minutes after the timer ended, since the finish time is then
   unknown. The row of dots stays, muted, above the heading. Primary
   action: Done (kept secondary, since it only dismisses).
8. **Home** (`map`): decide what to do next. Tier 1 and the one filled
   button: "I noticed some resistance", with a quiet hint under it until the
   first moment is saved. Below it, with a step already chosen, the reading
   order is: "Next step" (Heading), a Meta line ("{situation} · {minutes}
   min"), the step itself (Lead), "Change step" (Meta link), an optional
   "For: {purpose}" line, then Start (outlined); "Work on something else"
   follows as a quiet link. With a situation but no step yet, it reads
   instead: "Working on" (Heading), the situation (Lead), Choose a step
   (outlined), then "Work on something else". With noticed moments but no
   steps yet, only an outlined "I'm avoiding something" follows the button.
   The step or situation is the second tier. Below either step state: "Your
   progress", the worry sentence, and the row of dots. Primary action: I
   noticed some resistance.
9. **History** (`atlas`): review what came before. The screen's own title is
   visually hidden; the content carries the hierarchy. Tier 1: patterns,
   when any exist, each with its evidence stated in words. Then "Noticed",
   the newest five first with "Show all" for the rest, each moment a
   hairline-separated row: a Meta line ("Nov 10 · Written down in the
   moment"), what was happening (Body), then Meta lines for what it said,
   the watched minute ("You guessed it would fade. It stayed the same.") and
   the smallest thing to try, with "I tried it" on its own line. Tier 2,
   under "Your steps" when either section above exists: steps grouped by
   situation, newest first, newest group open, each group a Heading with a
   Meta line under it ("N steps · last {date}"); an entry inside a group
   reads Meta date (with how long it took, "Sep 29 · 4 min 20 sec", when
   known), Body step, then a Meta result line ("{comparison} · discomfort
   {expected} → {felt}"), a worry line when one was named ("You worried:
   "..." {status}", in Meta), and Details. Each group ends with "Take
   another step on this"; a hairline separates one group from the next. When
   there are no patterns yet, a single Meta line at the end of the list
   explains what it takes to find one. Primary action: none; this is a
   review screen. Empty state offers "Start with something you're avoiding".
10. **Your data** (`me`): manage local data. Tier 1: "Download a backup".
    Tier 2: "Restore a backup", "Delete all data", and the privacy line
    about what is sent to the AI service. Primary action: Download a backup.
11. **Noticing** (`notice`): write down a moment of resistance in a few
    seconds. Tier 1: "What's happening?" and its field. Then "What's it
    saying?" (optional), with the person's own earlier answers as one
    swipeable row of chips led by "Its usual lines", and "When did you
    notice?" (Just now, the default; Earlier today; Yesterday) as quiet
    chips. Primary action: Save. Reached from Home, and from the first screen
    for someone with no history yet.
12. **Noticed** (`noticed`): the acknowledgement. Tier 1: "You've met this
    one before" or "You haven't met this one before", then a Meta line with
    what was happening and the quoted line. After a "just now" entry, three
    equal outlined options: "Watch it for a minute", "Name the smallest thing
    you'd try" (opens a field with Save and Cancel) and "Leave it for now".
    Results from either follow-up show in Body under the heading. The only
    filled button is the smallest-thing field's Save, while it is open. The
    last button, outlined, reads "Leave it for now" until a follow-up is
    used, and "Done" after that or for an earlier entry.
13. **Watching a minute** (`watch`): first "What will it do in the next
    minute?" (Get louder, Stay the same, Fade; "Back" returns without
    saving) and "Start the minute", then a plain 1-minute ring with the
    quoted line (or what was happening, when nothing was said) and "Stop
    early", then "What did it do?" with Save or Skip. No back arrow on any
    part of it, and no rating or step is created.

## Recovery and accessibility

Storage failure must be visible; never imply a saved record if writing
failed. Preserve usable in-memory state and allow export. Invalid imported
or stored data cannot crash launch. Focus moves to the new screen's heading
on navigation. Touch targets are 44px where possible. Reduced motion removes
the dot settle animation. The offline shell loads all essential assets. The
timer, the reflection draft and the worry draft all restore after a reload,
and so does a watched minute started less than 30 minutes ago whose answer
hasn't been picked yet. The noticing form's text is not kept across a
reload. With no step running, a reopened app lands on Home (Start, before
any history), unless a flow is mid-way: What makes it hard, Your step,
Before you start, or a situation typed on Start.

## Backup, restore and history

Your data offers Restore a backup next to Download a backup. A restored file
is parsed and validated locally before a confirmation summarizes steps and
noticed moments to add and duplicates to skip. Merging never deletes local
records or replaces the current draft or an active timer; local copies win
id conflicts. Unsupported, corrupt or oversized files leave existing data
untouched. A restore is not counted as a new real-world step.

A step left with an unanswered worry ("can't tell yet") can be given a later
answer from its History entry, with three plain buttons (No, Partly, Yes),
not a radio group. This is the one narrow exception to a step's otherwise
immutable record. A later answer never counts toward a pattern; only the
answer given on How it went does, so answering later can't create or move
one.
