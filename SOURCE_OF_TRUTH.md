# Edge — source of truth

Status: implementation baseline, 7 September 2026. Source: “Write Claude Code Prompt”, conversation 6a9de2a4-7ee8-83e8-8d23-20ec9c1944ba; latest seven Stitch screenshots recovered and inspected. The current handoff request governs conflicts.

## Decision precedence
1. Current user request and its explicit corrections.
2. Latest approved seven-screen flow and surgical corrections.
3. Previously approved Home and Discovery principles where consistent with the latest flow.
4. Engineering decisions in these specs, explicitly provisional where the discussion left details open.

The source conversation explored alternatives. Those alternatives are not parallel requirements. No further broad visual redesign is authorized or needed.

## Locked decisions
- Gamify meaningful approach behavior in real life, never app engagement, suffering, or discomfort reduction.
- Personal geography grows from resistance the user actually encounters; no rigid territory curriculum or completion ladder.
- Evocative world, plain interface, precise insight. The model reasons; the product speaks through controlled language.
- Name → clarify only if needed → territory and expedition with prediction → leave Edge and act → progressive return → observation → changed map.
- First action should be reachable in roughly two minutes. No account, tutorial carousel, baseline questionnaire, or catalog before it.
- Prediction and experience each use integer 0–10 scales with no preselected answer.
- Return reveals discomfort, then avoidance response, then multi-select noticing.
- One encounter can support a small observation. Repeated, relevant evidence is needed for a discovery. Neither is guaranteed to be positive or surprising.
- Map / Atlas / Me navigation on established-user surfaces. Home is a world, not a dashboard.
- Today's Edge is selected by the behavior engine, with actual action copy and duration.

## Visual reference manifest
| File | Screen | Implementation correction |
|---|---|---|
| references/01-name.png | Opening and situation input | Empty input; example is a hint, never user history |
| references/02-clarify.png | Tentative interpretation | Conditional; editable and correctable |
| references/03-setup.png | Territory + expedition | Restore visible 0–10 prediction input; compact map as needed |
| references/04-active.png | Real-world action | Background-safe timestamp timer; early return and Stop |
| references/05-return.png | Reflection | Screenshot is final expanded state; reveal sequentially; multi-select |
| references/06-observation.png | First observation | Actual evidence only; other outcomes need truthful copy |
| references/07-home.png | First changed map | Replace both fixed recommendation title and misleading clarity/doubt copy |

Reference screenshots include sample values. Do not seed production with the sample proposal, 7 → 4, paths, or discoveries. Preserve their composition, paper/ink/terracotta system and serif hierarchy; do not use screenshot images as interactive screens.

## Provisional engineering decisions
- First implementation is a device-local offline PWA with a deterministic, user-correctable engine. This is a working foundation, not a claim of open-ended model understanding. Cross-device sync and server inference remain later phases.
- Four known territory families plus an unclassified fallback; “The Friction” was suggested but its definition was cut off, so it is not a locked territory.
- Discovery evidence policy, adaptation rules, storage model, accessibility details and release tests are specified below as implementation choices, not retroactive user approvals.

## Specification ownership
PRODUCT.md owns scope and outcome. UX.md owns screens and transitions. DESIGN.md owns presentation and language. BEHAVIOR_ENGINE.md owns judgments, evidence and recommendation rules. IMPLEMENTATION_PLAN.md owns sequence, acceptance gates and remaining work. Change a constraint here and in its owning document before changing implementation behavior.

## Next implementation slice — 7 September 2026
Continue the approved direction without new onboarding screens. Expand reviewed action templates for ordinary writing, messages, questions, conversations and checking; preserve unknown when context is insufficient. Evaluate each compatible noticing signal independently so multi-select evidence can support more than one discovery family. Add evidence-linked territory detail and discovery marks using stable geometry. Complete device-local portability with validated backup restore that merges encounters and preserves the current device's active session and drafts. These are implementation decisions within the existing contracts, not a new visual direction.
