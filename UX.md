# Threshold — UX contract

> September 12 decision: the owner explicitly requested removing the AI suggestions section and making suggestions always on. Situation/resistance continuation now requests the existing model automatically when online, including on fresh browsers and after local data deletion. The old consent preference is no longer read. Existing minimal payload, API limits, validation and offline fallback remain. Earlier default-off/toggle instructions below are historical and superseded. This authorization applies to the current private personal app.

> September 27 decision: the owner said this document is not binding on visual and layout passes. Sections 1, 3 and 4 now describe the app as built (no separate Name label, no Setup territory preview, Active title for screen readers only).

Current release: private version 3, including optional AI. Read [HANDOFF.md](HANDOFF.md) for current status, decision precedence and verification boundaries. Sections describing the initial build are historical where explicitly labeled.

## Global

Mobile-first at 390px, resilient at 320px and on desktop. Readable central column on large screens. One primary action per step; semantic headings, visible focus, named controls, back navigation preserving drafts. No bottom navigation during the first expedition. Save the active session and reflection draft so closing Threshold does not erase the experience.

## State transitions

Name → optional Clarify → Setup → Active → Return → Observation → Trail.
Trail → Explore → Setup; Trail → Work on something else (I'm avoiding something before any step exists) → Name.
Trail ↔ Atlas ↔ Me. Existing active sessions resume rather than creating overlapping attempts.

### 1. Name

THRESHOLD. “What do you keep turning away from?” Then the approved premise and a substantial textarea named by the screen title, with no second visible label. Examples stay hints, inside the input panel. Trim input, reject empty text, cap at 2,000 characters with a clear limit. Continue resolves a candidate or asks for clarification. No signup or onboarding tour.

### 2. Clarify — conditional

One tentative interpretation, “What feels closest?”, and the five approved choices: understand it first; don't know where to start; worried I'll do it badly; unpleasant to begin; something else. A correction can change territory and action; it is not a cosmetic edit. Something else accepts text and permits an unclassified action. High-confidence, concrete input can skip this step; correction remains available on Setup.

### 3. Setup

No territory preview: on a first situation it was an empty rectangle, so the trail lives on Home only. Show the person's situation and chosen difficulty as context with an Edit link, then title, concrete instruction, duration and brief rationale if useful. Let the user edit the action or make it smaller. The prediction scale has eleven labeled integer choices 0–10, no default. Use wrapping rows on narrow screens rather than tiny hit areas. Begin requires an action and explicit prediction. Prior responses do not auto-fill a new prediction.

A quiet link, “Name a worry”, opens an optional one-line worry field labelled “What are you worried will happen?”, with a territory-specific placeholder. It never prefills: like the prediction, it's a fresh guess each time. This replaces the old “what do you expect will happen?” note, which is no longer shown; existing records that have one keep it in the Atlas.

When a purpose carries over from an earlier encounter with the same situation, it shows as one line, “For: {purpose}”, in the same echo as the situation, with its own Edit link; there is no open input by default. Otherwise a quiet link, “Name what it’s for”, sits on the same row as the worry link and opens an optional one-line input labelled “What is this for?”, hinting “Who it helps, or what it makes possible.” Both links and the fields they open sit under Begin, so opening one never pushes Begin below the fold.

### 4. Active

Remaining time and exact action; the action title is a screen reader heading only. “Go do it. Come back when you're done, or when something interesting happens.” I'm back and Stop remain available immediately. Time is derived from start/deadline timestamps, not decrement ticks; reaching zero does not complete an encounter. No demand to hold or turn over a device. No notification permission prompt. Stop must permit reporting an attempted action or recording that it was not started.

When the step has a purpose, a meta line “For: {purpose}” sits under the step text. The timer stays the primary element; I'm back and Stop remain reachable without scrolling.

### 5. Return

First show only “How uncomfortable was it actually?” with 0–10. Selecting reveals “Did an urge to avoid or leave show up?” Choices: No; Yes, and I stayed; Yes, I left and came back; Yes, and I stopped. Selecting that, when a worry was named on Setup, reveals “Did what you were worried about happen?” with the worry quoted underneath and choices No / Partly / Yes / Can't tell yet; a session with no worry skips straight past this step. Answering it (or, without a worry, answering the urge question) reveals “What did you notice?” Multiple compatible choices may be selected. Nothing stood out is exclusive; Something else reveals optional text. Include harder-than-expected alongside the approved neutral/positive options. Do not require surprise. Allow an explicit “I didn't start” outcome without inventing discomfort or approach evidence; it also leaves the worry question unanswered rather than recording one. The final action reads Skip (outlined) until something is chosen, then Continue. Either saves once; repeated clicks/reloads cannot duplicate records.

Changing an earlier response preserves unrelated draft answers, but contradictions must be corrected or excluded from claims. A claim about continuing cannot be inferred from prediction/experience numbers alone.

### 6. Observation

Add a stone to the trail only when an attempt occurred. Title and text reflect actual report. First Observation is singular and cautious. Example only when the user reports it: “The Doorway Felt Worse” and “This time, starting felt harder than continuing. Let's see if it happens again.” Show actual Expected → Experienced values with no bars. Nothing stood out gets a neutral encounter record, not an invented insight. Not started gets no new stone. One meta line under the trail places the step: which step it was and how many so far felt easier than expected, or that the trail grows only when a step is started. When the encounter named a worry, a line under the body quotes it and says what happened; “can't tell yet” adds that it can be answered later from the Atlas. See my trail is the single primary action.

### 7. Trail

The trail (latest four steps, "+N earlier" opening the Atlas) sits above Today's Threshold, which leads: engine-selected title, instruction and duration. When that step has a purpose, “For: {purpose}” appears as a quiet meta line under the instruction, not as a third eyebrow line. A short key sits directly under the trail: how many steps felt easier than expected, then (once there are at least two answered worries) how many of them didn't happen, naming both counts (“Of 3 worries you followed up on, 2 didn't happen and 1 did, at least in part.”, or “Neither worry you followed up on happened.” when none did), what the numbers mean, what a half-filled stone means (only once one exists), and that a stone opens its entry. Explore opens setup; Work on something else starts from current life. Never display a catalog of locked territories or fake history. A recommendation may remain in one territory or change with a new situation; never force novelty.

### Atlas

Observations and discoveries with source situation, date, expected/actual values and behavior. Inspect supporting and contrary encounters. No KPI dashboard. Empty copy: “Your observations will appear here after you try an expedition.” An encounter's expanded detail includes a “What it's for” row when a purpose was named.

### Me

Explain device-local history and the version-3 optional AI transmission boundary. Preferences is reachable before the first encounter; AI defaults off. Export data, delete with explicit confirmation, and practical installation guidance. No invented identity or wellbeing metrics.

## Recovery and accessibility

Storage failure must be visible; never imply a saved record if writing failed. Preserve usable in-memory state and allow export. Invalid imported/stored data cannot crash launch. Focus moves to the new screen heading; progressive sections announce politely without stealing focus. Touch targets 44px where possible; scale wraps. Reduced motion removes the stone settle animation. Offline shell must load all essential assets. Session timer, reflection and trail restore after reload.

## Backup restore and trail history

Me offers Restore a backup next to Export. Parse and validate locally before staging a review. A confirmation summarizes encounters to add and duplicate IDs to skip. Merge without deleting local records or replacing current drafts/active sessions. Local copies win ID conflicts. Unsupported, corrupt or oversized files leave existing data untouched. A restore is not counted as a new real-world encounter.

Because local copies win ID conflicts, a worry answered later from the Atlas on one device does not survive restoring a backup from another: the local copy of that encounter, without the later answer, wins. This is a known limitation of device-local storage, not a bug.

Tapping a stone opens that encounter in the Atlas; each Atlas entry's territory eyebrow filters the Atlas to that territory. Keyboard and touch both work. The Atlas filter can be cleared to show all history. New discoveries may use the existing observation reveal screen with evidence drawn from the eligible encounters; no additional first-use screen is added.

An encounter left with an unanswered worry (“can't tell yet”) can be given a later answer from its Atlas entry: three plain buttons, No / Partly / Yes, not a radio group (arrow keys would select as they move). Picking one saves it as the one narrow exception to encounter immutability, updates the line shown, and adds a Change button; a polite status message confirms it was saved. A later answer never counts toward a bluff discovery, only a Return answer does, so answering later can't move or create a discovery.

## September 7 integration update

Optional AI suggestions preserve the approved screens and first-use flow. The current contract, privacy disclosure, bounded request limits and validation status are recorded in [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md). AI remains off until the user opts in; observations, discoveries and trail evidence remain local and deterministic.
