# Edge — UX contract

Current release: private version 3, including optional AI. Read [HANDOFF.md](HANDOFF.md) for current status, decision precedence and verification boundaries. Sections describing the initial build are historical where explicitly labeled.

## Global
Mobile-first at 390px, resilient at 320px and on desktop. Readable central column on large screens. One primary action per step; semantic headings, visible focus, named controls, back navigation preserving drafts. No bottom navigation during the first expedition. Save the active session and reflection draft so closing Edge does not erase the experience.

## State transitions
Name → optional Clarify → Setup → Active → Return → Observation → Map.
Map → Explore → Setup; Map → I'm avoiding something → Name.
Map ↔ Atlas ↔ Me. Existing active sessions resume rather than creating overlapping attempts.

### 1. Name
EDGE. “What do you keep turning away from?” Then the approved premise and a substantial textarea labeled “What's something you've been avoiding lately?” Examples stay hints. Trim input, reject empty text, cap at 2,000 characters with a clear limit. Continue resolves a candidate or asks for clarification. No signup or onboarding tour.

### 2. Clarify — conditional
One tentative interpretation, “What feels closest?”, and the five approved choices: understand it first; don't know where to start; worried I'll do it badly; unpleasant to begin; something else. A correction can change territory and action; it is not a cosmetic edit. Something else accepts text and permits an unclassified action. High-confidence, concrete input can skip this step; correction remains available on Setup.

### 3. Setup
Reveal only the relevant territory alongside the action. Territory is context, not a separate destination selection. Show title, concrete instruction, duration and brief rationale if useful. Let the user edit the action or make it smaller. The prediction scale has eleven labeled integer choices 0–10, no default. Use wrapping rows on narrow screens rather than tiny hit areas. Prediction note is optional. Begin requires an action and explicit prediction. Prior responses do not auto-fill a new prediction.

### 4. Active
Action title, remaining time and exact action. “Go do it. Come back when you're done—or when something interesting happens.” I'm back and Stop remain available immediately. Time is derived from start/deadline timestamps, not decrement ticks; reaching zero does not complete an encounter. No demand to hold or turn over a device. No notification permission prompt. Stop must permit reporting an attempted action or recording that it was not started.

### 5. Return
First show only “How uncomfortable was it actually?” with 0–10. Selecting reveals “Did an urge to avoid or leave show up?” Choices: No; Yes, and I stayed; Yes, I left and came back; Yes, and I stopped. Selecting reveals “What did you notice?” Multiple compatible choices may be selected. Nothing stood out is exclusive; Something else reveals optional text. Include harder-than-expected alongside the approved neutral/positive options. Do not require surprise. Allow an explicit “I didn't start” outcome without inventing discomfort or approach evidence. Continue saves once; repeated clicks/reloads cannot duplicate records.

Changing an earlier response preserves unrelated draft answers, but contradictions must be corrected or excluded from claims. A claim about continuing cannot be inferred from prediction/experience numbers alone.

### 6. Observation
Show a small visible map change only when an attempt occurred. Title and text reflect actual report. First Observation is singular and cautious. Example only when the user reports it: “The Doorway Felt Worse” and “This time, starting felt harder than continuing. Let's see if it happens again.” Show actual Expected → Experienced values with no bars. Nothing stood out gets a neutral encounter record, not an invented insight. Not started gets no new route. See my map is the single primary action.

### 7. Map
Dominant continuous map, actual route history, known territory names, current candidate direction and unresolved surrounding space. Today's Edge includes engine-selected title, instruction and duration. Explore opens setup; I'm avoiding something starts from current life. Never display a catalog of locked territories or fake history. A recommendation may remain in one territory or change with a new situation; never force novelty.

### Atlas
Observations and discoveries with source situation, date, expected/actual values and behavior. Inspect supporting and contrary encounters. No KPI dashboard. Empty copy: “Your observations will appear here after you try an expedition.”

### Me
Explain device-local history and the version-3 optional AI transmission boundary. Preferences is reachable before the first encounter; AI defaults off. Export data, delete with explicit confirmation, and practical installation guidance. No invented identity or wellbeing metrics.

## Recovery and accessibility
Storage failure must be visible; never imply a saved record if writing failed. Preserve usable in-memory state and allow export. Invalid imported/stored data cannot crash launch. Focus moves to the new screen heading; progressive sections announce politely without stealing focus. Touch targets 44px where possible; scale wraps. Reduced motion removes route animation. Offline shell must load all essential assets. Session timer, reflection and map restore after reload.

## Backup restore and map history
Me offers Restore a backup next to Export. Parse and validate locally before staging a review. A confirmation summarizes encounters to add and duplicate IDs to skip. Merge without deleting local records or replacing current drafts/active sessions. Local copies win ID conflicts. Unsupported, corrupt or oversized files leave existing data untouched. A restore is not counted as a new real-world encounter.

Known territory labels on the map open the corresponding Atlas history. Keyboard and touch both work. The Atlas filter can be cleared to show all history. New discoveries may use the existing observation reveal screen with evidence drawn from the eligible encounters; no additional first-use screen is added.


## September 7 integration update

Optional AI suggestions preserve the approved screens and first-use flow. The current contract, privacy disclosure, bounded request limits and validation status are recorded in [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md). AI remains off until the user opts in; observations, discoveries and map evidence remain local and deterministic.
