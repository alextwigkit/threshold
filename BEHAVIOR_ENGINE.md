# Threshold — behavior engine

Current release: private version 3, including optional AI. Read [HANDOFF.md](HANDOFF.md) for current status, decision precedence and verification boundaries. Sections describing the initial build are historical where explicitly labeled.

## Governing rule
The model should reason; the product should speak. Keep interpretation, candidate selection, evidence evaluation and map projection separate from rendering. Never optimize for discomfort reduction, time in app or forced progression.

Pipeline: situation → resistance → avoidance move → primary/secondary territory → smallest meaningful approach → calibration → expedition → prediction → encounter → observation → repeated evidence → discovery.

## Input and decision contract
Input: situation text, optional confirmed resistance, user-edited action, recent encounters, current capacity and last recommendation. Output: version, confidence, needsClarification, resistance code, primary territory or null, secondary territories, template ID, action slots, duration, reason code and source encounter IDs. Enum validation, length limits and safe defaults precede rendering. This is the conceptual engine contract. The shipping provider receives a deliberately narrower input and returns the schema in server/inference.ts; it cannot create territory names, reward claims or arbitrary UI labels. History remains local.

User correction outranks an inference. Do not force an unknown case into the closest family. The first local implementation may use lexical hints only as tentative routing; ambiguous cases ask for a choice. It must disclose its local nature in Me, not inject technical language into the action flow.

## Territory ontology
| ID | Name | Resistance | Possible avoidance move |
|---|---|---|---|
| fog | The Fog | Uncertainty, acting before knowing | Researching instead of beginning |
| spotlight | The Spotlight | Evaluation or visibility | Withholding a useful question or draft |
| loop | The Open Loop | Incompleteness, checking, closure | Rechecking after adequate functional review |
| water | Still Water | Staying with an unpleasant internal state | Distraction or immediate fixing |
| unknown | Unclassified | Insufficient or different information | Ask user; no invented label |

A situation can have multiple memberships. Reveal a secondary region only when the user confirms its relevance or a real encounter supplies evidence. “The Friction” is not included as a defined territory because the source did not finish that proposal. Inhabitants name repeated moves, never diagnoses or anxiety itself.

## Clarification
Skip only for a concrete action and unambiguous resistance. Otherwise ask the single approved clarification. Distinguish wanting to understand, not knowing the first step, worry about doing it badly, unpleasantness, and something else. The latter supports free text and a user-authored action. Always permit correction on Setup. No personality inference.

## Expedition selection
A valid candidate includes an observable action, a bounded dose (initially 1–5 minutes), relevance to the named situation, and an optional avoidance behavior to refrain from. Never replace a real action with journaling about doing it. Preserve necessary safety, consent and functional checks. Avoid generic “be brave” instructions.

Reviewed examples:
- Fog, proposal: Open the proposal and spend 3 minutes writing three possible sections, even if unsure.
- Spotlight: Ask one relevant question before you feel completely certain how it will sound. User chooses person/channel; Threshold does not send it.
- Open Loop: Complete the necessary functional check, then end one extra polishing pass.
- Still Water: Spend one minute noticing the feeling without immediately opening a distraction. Stop if needed.
- Unknown: User names a small concrete action toward their situation; engine does not manufacture context.

For unsupported situation details, require the user to supply the exact action instead of inserting the whole situation into an awkward template. Show the final action before Begin. User edits are retained with the record.

## Calibration and Today's Threshold
Start small. A recent stop or high reported difficulty suggests a smaller dose, never a shame message. Repeated attempted approach may offer a modest duration increase, but discomfort need not decrease. User can always make it smaller or change the action. No automatic escalation based only on low discomfort.

Priority: resume active session; otherwise explicit new situation; otherwise a relevant variant grounded in the latest confirmed situation and history. Do not randomly rotate territories or exhaust one before revealing another. If context is stale or unclear, ask for current resistance. Candidate selection is deterministic for unchanged evidence. Home renders the returned title, action and duration; it must not own recommendation strings.

## Encounter storage
An encounter has id, situation, resistance, territory memberships, action/template version, proposed duration, predictedDiscomfort (integer 0–10), optional prediction note, startedAt, returnedAt, outcome (attempted/stopped/not_started), actualDiscomfort (0–10 or null for not_started), avoidance response, noticing codes, optional note and createdAt. Save idempotently by session ID. Do not infer actual behavior from timer expiry. Preserve all evidence even when no discovery follows.

## Observation policy
Each claim cites its encounter ID and scoped wording. No global claims from one attempt.
- Reported starting harder than continuing → “The Doorway Felt Worse.” Do not derive this from expected minus actual alone.
- Reported working while uncomfortable and compatible behavior → “Uncomfortable, and Still Here.”
- Easier than predicted → “Different Than Expected,” limited to this encounter.
- Stopped → acknowledge approaching and stopping; no assertion of staying.
- Nothing stood out → “An Encounter, Recorded.” No manufactured lesson.
- Not started → no approach trace, no discovery evidence.

If a noticing code contradicts behavior, exclude that claim rather than silently rewriting the report. Numeric expected/actual difference is descriptive, never a score.

## Discovery policy — provisional, test before release
Use windows of up to six comparable attempted or stopped encounters in a territory. Stopped outcomes do not support staying/continuing claims. Require at least four encounters on at least three distinct local dates, at least three explicit supporting observations, and at least 75% support among eligible encounters. A single session or many repeats in one day cannot produce a discovery. Retain evaluated encounter IDs, supporting IDs, contrary IDs, rule and establishment date in the derived discovery. Current code reconstructs this from saved encounters rather than persisting a separate discovery object.

“The Doorway Is Worse Than the Room” requires explicit starting-versus-continuing noticing; prediction error alone cannot establish it. “You Can Act While Uncomfortable” requires actual discomfort and compatible reported approach. Use tentative wording (“Across these encounters…”), not diagnosis or permanence. With mixed evidence, keep observations and withhold the discovery. New contradictory evidence updates the evidence view and confidence; do not erase the original history. No rewards for selectively favorable reporting.

## Map projection
Map state is derived from encounters, not clicks. Not-started adds nothing. Attempted/stopped adds one stable trace attached to the encounter ID. Familiarity grows with eligible evidence independent of discomfort delta. A discovery resolves a feature once per rule/territory, with evidence references. No invented history, completion percentages or rigid unlock chain.

## Inference service contract
Keep secrets server-side; validate structured responses and treat user text as data. Include timeout/error/offline paths to editable reviewed templates. Consent and retention must be specified before transmitting sensitive situations. Evaluate ambiguity, negation, multi-territory cases, unsafe requests, cultural context, contradictory evidence, overgeneralization and user correction. A keyword prototype cannot pass as this service.

## Required tests
Prediction zero accepted; missing prediction rejected; correction changes routing; no fixed Fog next action; not-started never changes map; stopped does not imply stayed; higher discomfort can support approach; neutral noticing yields neutral observation; one attempt cannot create discovery; duplicates cannot inflate evidence; mixed evidence suppresses discovery; clock-based timer survives backgrounding; records survive reload; invalid storage degrades visibly.

## Local engine continuation
- A plain statement that beginning feels unpleasant is not sufficient to classify Still Water. Use an unclassified step unless the situation explicitly concerns staying with an internal feeling; this preserves the distinction between starting a task and practicing non-escape.
- Reviewed actions cover drafting, replying, asking, beginning a conversation and stopping an extra checking pass. Retain user edits when offering a repeat. No automatic action for an ambiguous high-stakes decision.
- Doorway and acting-while-uncomfortable evidence are evaluated independently from compatible noticing selections; the displayed primary observation cannot discard additional evidence.
- Discovery thresholds apply separately to each family. A carried-discomfort discovery requires an attempted outcome, actual discomfort above zero, and an explicit compatible noticing response. Lower discomfort is never required.


## September 7 integration update

Optional AI suggestions preserve the approved screens and first-use flow. The current contract, privacy disclosure, bounded request limits and validation status are recorded in [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md). AI remains off until the user opts in; observations, discoveries and map evidence remain local and deterministic.
