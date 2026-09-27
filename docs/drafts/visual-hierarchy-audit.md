# Visual hierarchy audit (2026-09-27)

Status: first implementation pass done (see section 7). The diagnosis below describes the screens *before* that pass. Screens were captured at 390x844 from the local dev server (offline suggestion path) and compared with the owner's phone screenshots and the approved Stitch references in `references/`. Captures live in `../.playwright-mcp/` (01 to 10).

## 1. What the sources say

These principles are the core of any typography or visual design foundations course. Each one is phrased as a rule you can test.

| # | Principle | Source |
|---|---|---|
| P1 | **One dominant focal point per screen.** Only 1 or 2 elements are "large"; the most important thing is clearly the heaviest. | NN/g, [Visual Hierarchy in UX](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/); NN/g, [5 Principles of Visual Design](https://www.nngroup.com/articles/principles-visual-design/) |
| P2 | **Few levels.** About 3 sizes and 3 contrast levels per screen. Typographic roles are assigned by meaning (screen title, body, label), not by eye. | NN/g (as above); [Material 3 type roles](https://m3.material.io/styles/typography/applying-type); [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| P3 | **Steps must be judged, not arbitrary.** Use a modular scale (a ratio such as 1.25 or 1.333) so each level differs clearly from the next. Sizes 1 or 2px apart read as the same level. | Tim Brown, [More Meaningful Typography](https://alistapart.com/article/more-meaningful-typography/); Butterick, [Point size](https://practicaltypography.com/point-size.html) |
| P4 | **Consistent cues, at most about 3 per level.** A level is size plus weight plus color, applied the same way everywhere. Stacking caps, color, borders and italics on top becomes noise. | Ellen Lupton, [Thinking with Type: Hierarchy](https://thinkingwithtype.com/text/) |
| P5 | **Emphasize by de-emphasizing.** When the important thing doesn't stand out, quiet its neighbors instead of shouting louder. Use 2 or 3 ink tiers (dark, mid gray, light gray) rather than many sizes. | Wathan & Schoger, *Refactoring UI*, "Hierarchy is Everything" (secondary summaries; the book isn't freely hosted) |
| P6 | **Proximity and similarity.** Related things sit closer together than unrelated things. Things that look alike are read as the same kind of thing, so unrelated roles must not share a style. | Gestalt principles; NN/g 5 Principles |
| P7 | **Reading order equals priority order.** The eye should be pulled through the screen in the order the user needs, with the heading first. | NN/g Visual Hierarchy; Lupton |
| P8 | **One question per page, and the question is the heading.** Hints are one short sentence and are never the only guidance. Placeholders are not labels. | GOV.UK, [Question pages](https://design-system.service.gov.uk/patterns/question-pages/) and [One thing per page](https://www.gov.uk/service-manual/design/form-structure); NN/g, [Placeholders are harmful](https://www.nngroup.com/articles/form-design-placeholders/) |
| P9 | **Button emphasis tracks importance and consequence.** One filled button per screen, and lower levels are visibly lower. A destructive action must not look identical to a benign one. | [Material 3 Buttons](https://m3.material.io/components/buttons/guidelines); NN/g, [Command links](https://www.nngroup.com/articles/command-links/) |
| P10 | **Accent color is a scarce signal.** When terracotta marks several unrelated things, it stops meaning "important." | NN/g 5 Principles (contrast) |
| P11 | **Never de-emphasize by dropping below legible contrast.** Keep at least 4.5:1 for text under 18px. | NN/g 5 Principles; WCAG 2.2 SC 1.4.3 |
| P12 | **Squint test.** Blur the screen: the thing that survives should be the thing that matters, and related items should still group together. | [LukeW](https://www.lukew.com/); [Polypane squint test](https://polypane.app/blog/debug-your-visual-hierarchy-with-the-squint-test/) |
| P13 | **Primary action within thumb reach.** Keep the main action near the bottom and reachable without hunting. | Hoober via LukeW, [Designing for large screen smartphones](https://www.lukew.com/ff/entry.asp?1927) |

## 2. System-level causes (why most screens fail)

Almost every per-screen failure traces back to these five problems. Fixing them first means the screen fixes become small.

1. **There is no type scale, just roughly 20 font sizes.** The CSS uses 54, 38/30, 30, 28, 27, 25, 25.6, 24, 24, 22, 19, 18, 18, 18, 17, 16, 15, 14 (five separate roles), 13, 12 and 11px. Pairs that compete: the active step (25px) against the Atlas h2 (25.6px); the observation copy (24px) against h3 (24px); and five unrelated roles all at 14px. This breaks P2 and P3.
2. **Serif is used for both "heading" and "body worth reading."** Newsreader carries headings, the name textarea (22px), hints, the mechanic note, the active step (25px), the invitation (19px italic) and the observation copy (24px). Because the heading's main cue (serif face) also appears on content, size is left as the only separator, and those sizes are close together. This breaks P4 and P6.
3. **There are seven text grays and no tiers.** The CSS has `#50534e`, `#73776e`, `#33362f`, `#40443b`, `#656b5e`, `#575c51` and `#8a8c83`, none of them tokens. `#73776e` measures **4.35:1** on paper and fails AA for the small text it is used on (scale ends at 12px, "Optional" at 14px, hints). The placeholder `#8a8c83` is 3.25:1. This breaks P5 and P11.
4. **Only two button levels exist, and the lower one is overloaded.** `.text-button` (muted underlined text) covers navigation, edits, fallbacks, "I didn't start", Export, Restore and **Delete my map**. `.avoid-row` has the same full-width shape and arrow as `.primary`. There are three different tertiary link looks (sans underlined, serif underlined, centered plain "Stop"). This breaks P9.
5. **Alignment and chrome drift.** The wordmark moves (left on some screens, right with a back arrow on others). Text alignment switches mid-screen: setup's territory line is centered, then everything below is left-aligned, and the active screen is fully centered. This breaks P7 and grid discipline (Müller-Brockmann).

## 3. Screen by screen

For each screen: what the squint test shows first, what it *should* show first, the failures, and the fix.

### Name (`01-name.png`)
- **Squint:** the heading and the large serif textarea tie. The intro paragraph (18px) is bigger than the actual question label (16px/500).
- **Should be:** the question, then the field.
- **Failures:** the intro is larger than the label (P3, P7). The hint sits inside the field in serif, looking like entered text (P6, P8). The header's "Preferences"/"My map" link sits at the same weight as the wordmark.
- **Fix:** make the question the h1 (P8), cut the intro to one short muted line under it or remove it, set the textarea in sans ink 18px so it doesn't mimic a heading, and move the example hint below the field in the meta style.

### Clarify (`03-clarify.png`)
- Closest to passing. The heading is clear, and options are equal-weight rows.
- **Failures:** "Something else" was preselected (P1: nothing should be preselected in a question). Unselected radio circles are faint. "Edit what I'm avoiding" is the only serif link in the app (P6). The user's own situation isn't shown, so they answer "what makes it hard" without seeing "it."
- **Fix:** no default selection. Show the situation as one meta line above the question. Use the standard tertiary link style.

### Setup (`04-setup.png`, `04b`, owner's screenshot) **worst offender**
- **Squint:** in order, the Title Case heading, the gray textarea box, the 11 scale cells and the black Begin (below the fold). The step itself (the thing they're about to go do) is only the third-strongest element, sitting inside a pale box under a small label.
- **Should be:** the step, then the prediction, then Begin.
- **Failures:**
  - The territory sentence (15px, centered, gray) comes *before* the heading, and in the offline path it is stacked under a notice banner. The first thing read is neither the heading nor the task (P7).
  - The heading "Take One Small Step" / "Choose Your Own Step" is an instruction dressed as a title (P8: the heading should say what this page asks). It then carries onto the active screen as if it were the step's name (see Active).
  - The user's own situation appears small and gray in a quote bar, the weakest text on the screen, even though it is the context everything answers to.
  - "The step you'll take" (label) and "How uncomfortable do you expect this to be?" (a question) share one style. So do "What do you expect will happen?" and the label. Four unrelated roles, one look (P6).
  - The duration row puts a static label ("3 min") and two actions ("Make it smaller", "Adjust the fit") at the same 14px, told apart only by underline (P9).
  - The mechanic note is a third text voice (gray serif paragraph) between the step and the scale (P4).
  - The 0 to 10 scale wraps 6 + 5, making 6 to 10 read as a separate group (P6, proximity).
  - Begin is below the fold at 390x844 (P13).
- **Reference comparison:** the Stitch design shows the step as prominent ink text directly under the title, followed by one quiet serif line of encouragement, then a rule, then the prediction. The implementation added the editable box, the duration row, the note and the offline banner, and each one pulled weight from the step.
- **Fix:**
  - Order: situation (meta line) → h1 = the step's name → **the step, as the screen's hero text** (sans, ink, about 20px, editable in place with a visible "Edit" affordance, or a borderless field that looks like text until focused) → one line of duration with actions as clear tertiary links → rule → the prediction question as an h2-level question → scale on one row of 11 (at 390 that gives cells about 27px wide by 44px tall, which is narrower than Apple's 44pt minimum touch target; the reference accepts this, but the alternative is a 0 to 10 slider or an intentional 2-row split with the ends labeled on each row) → optional expectation → Begin.
  - Move the offline notice to a single quiet meta line near the step ("Built-in suggestion; suggestions are offline"), not a banner at the top.
  - Drop the territory sentence from this screen or fold it into the meta line.

### Active (`05-active.png`, owner's screenshot)
- **Squint:** the timer wins (correct), but the heading, step text and italic invitation are all serif at 30 / 25 / 19px, which is three near-levels of one voice.
- **Failures:**
  - The heading shows "Choose Your Own Step" (the setup instruction) as if it named the step. In the owner's run, the step text read like a situation ("Wanting to move away from tension..."), so either the model returned a situation-shaped action or the field was filled that way. That's worth checking separately; it's content, not layout.
  - The terracotta dot is spent on "Time keeps counting when you leave the app" (P10).
  - "Stop" is faint, centered, plain text with no underline, a fourth link style (P9).
  - The wordmark sits top left while the whole screen is centered.
- **Fix:** Timer (display), then the step (the only other large text), then everything else at body/meta. Drop the h1 on this screen, or show the real step name, never the setup instruction. Remove the accent dot. Make Stop a standard secondary button.

### Reflection (`06a` to `06d`, owner's screenshot)
- **Squint:** "What happened?" (h1), then each revealed h2 question at 28px, then 11 cells and 11 option cards. Everything already answered stays at full weight, so the current question never stands out.
- **Failures:**
  - "What happened?" is a heading that asks nothing. The first real question, "How uncomfortable was it actually?", is styled as a small label under a rule (P8). The reference makes that question the heading and has no "What happened?".
  - Answered questions don't recede (P5, P7). By the third question, the screen is a wall of 7 equal cards plus 4 more above.
  - "I didn't start" sits *after* Continue, at the bottom of a long page. For someone who didn't start, the right answer is the last thing they find.
- **Fix:** make each question its own heading at a single level. Collapse answered questions to a one-line summary ("Actually: 4 · Urge: No", meta style, tap to change). Put "I didn't start" directly under the first question, where it is relevant. The 7 noticing options would benefit from being cut or grouped (content decision, see calls below).

### Observation (`07-observation.png`)
- **Squint:** the map card (huge), then the h1 "The Doorway Felt Worse", then the 24px gray serif paragraph competing with it, then the evidence pill.
- **Failures:** there are three attention senders stacked: the accent caps eyebrow, the h1 and the large muted serif copy (P4). The observation copy at 24px is nearly the h1's size. The map card uses about half the viewport for a single short line.
- **Fix:** Eyebrow (meta), h1, then the evidence as a quiet line, then the copy at body size in ink. Shrink the map card on this screen so the claim sits in the upper half.

### Map / Home (`08-map.png`)
- **Squint:** map, then the accent eyebrow, then "Let It Be Seen", then Explore.
- **Failures:** there is no visible page heading once history exists (the h1 is sr-only), so the eyebrow plus the h2 recommendation act as the heading. The situation quote bar repeats the setup's weak treatment. The terracotta is used on the eyebrow, the map path, the active tab and the map dot (P10). "Explore" as a label doesn't say what happens.
- **Fix:** keep the map dominant (DESIGN.md intent), and let the recommendation below read as h2 plus step plus one button. Use the accent in one place per screen (the path). Rename Explore to the action ("Start this step").

### Atlas (`09b-atlas-open.png`)
- **Failures:** the open encounter is six unlabeled 14px lines ("No", "Expected 6 → Experienced 4", ...). Nothing tells you which line is the situation, the step, the urge answer or the notices (P6, and Refactoring UI's "labels when users scan for fields"). "No" on its own is meaningless.
- **Fix:** use a small definition list with meta-style labels ("Situation", "Step", "Discomfort", "Urge", "Noticed") and ink values.

### Me (`10-me.png`)
- **Failures:** Export, Restore and **Delete my map** share one style (P9). Two intro paragraphs at body size come before the only actionable section. The spacing between "Keep your map" and its paragraph is the same as between sections (P6).
- **Fix:** Export as a secondary (outlined) button, Restore as a tertiary link, Delete as a destructive-colored tertiary in its own section. Tighten spacing within sections and loosen it between them.

### Login (`server/auth.ts`)
- Not captured in this pass. It is a simple single form, but it duplicates the tokens as raw hex. When the scale changes, it has to change too.

## 4. Proposed system

**Type roles** (1.25 scale off a 16px base; serif only for the page heading and the timer):

| Role | Face | Size | Weight / color | Used for |
|---|---|---|---|---|
| Display | Newsreader | 54px | ink | Timer only |
| Title | Newsreader | 30px (32 on wide screens) | ink | The one page heading, always the question or the name |
| Heading | Newsreader | 24px | ink | Sub-questions (reflection), Atlas entries, Me sections |
| Lead | sans | 20px | ink | The step, observation claim, and other content the user must read |
| Body | sans | 16px | `--muted-foreground` | Explanations, options |
| Meta | sans | 13px, 500 | tertiary gray (new, at least 4.5:1) | Labels, eyebrows (caps only here), situation line, scale ends, "Optional" |

Italic serif survives only as one intentional voice line where the reference uses it (active invitation), or it goes.

**Ink tiers:** ink `#20211E`, secondary `#50534E` (7.4:1), and tertiary darkened from `#73776E` (4.35:1) to `#666A62` (5.26:1 on paper, measured). All seven one-off grays collapse into these three tokens.

**Action levels:** Primary (filled ink, one per screen), Secondary (outlined, for "Stop", "Export"), Tertiary (sans underlined link, one style everywhere), Destructive (tertiary in accent color, isolated). `.avoid-row` either becomes Secondary or loses the arrow.

**Layout:** left-align everything except the timer block. The wordmark sits in one fixed position. The primary action stays at the bottom and is reachable without scrolling on setup.

## 5. Checklist (run per screen, at 390px and 320px, before and after)

1. Blur test: the intended focal element is noticed first, and the heading is read before anything else except the timer. (P1, P7, P12)
2. No more than 3 type roles visible above the fold, plus meta. (P2)
3. No two different roles within 15% in size unless they differ in face and color. (P3, P6)
4. Serif appears only on the Title, Heading and Display roles. (P4)
5. Every text color is one of the 3 ink tokens or the accent, and all measure at least 4.5:1. (P5, P11)
6. Exactly one filled button, and a destructive action never shares a style with a benign one. (P9)
7. The accent appears on at most one element type per screen. (P10)
8. Within-group spacing is visibly smaller than between-group spacing. (P6)
9. The page heading is the question or the name, never an instruction or a generic label. (P8)
10. On setup, Begin is visible without scrolling at 390x844. (P13)

## 6. Judgment calls made in this audit

- Treated the Stitch references as the intended hierarchy where they differ from the implementation (the setup step as hero text, the reflection question as heading). If the implementation's additions (the editable box, the duration row) were deliberate product changes, the setup fix changes shape but not the principle.
- Proposed collapsing serif to headings only. This is the biggest change to the brand feel. The alternative is to keep serif for the step and demote the headings instead; either works, but not both at once.
- Flagged the owner's "Wanting to move away from tension..." step as content, not layout, and did not investigate the model output.
- Cutting or grouping the 7 noticing options is a product and content decision (the options feed discoveries in BEHAVIOR_ENGINE.md), so it is listed, not decided.

## 7. Implementation status (2026-09-27)

Done in `app/globals.css` and `app/page.tsx`. After-captures are `../.playwright-mcp/v2-*.png`.

- **Tokens and roles:** added `--meta-foreground` (`#666A62`, 5.26:1), plus `.lead` (20px sans ink) and `.meta` (13px/500). h1 is capped at 32px, h2 is 24px, and the per-screen h2 and active h1 overrides are gone. Every one-off text gray now maps to a token (map SVG fills unchanged).
- **Serif:** now only on h1/h2/h3, the scale question and the timer. The name textarea, hints, mechanic note, active step, invitation, observation copy and the clarify link are sans.
- **Buttons:** added `.secondary` (outlined), used for Stop, "I'm avoiding something" and Export. Delete uses the new `.text-button.destructive`. `.avoid-row` no longer mimics the primary.
- **Name:** the h1 is the field's label, the duplicate label question is gone, and the hint is Meta text under the field.
- **Clarify:** the situation shows as a Meta line above the question, and the serif link is removed.
- **Setup:** the situation is a Meta line above the h1, the territory sentence is removed, the label reads "Your step" in Meta, the step text uses Lead, the mechanic note is shortened, and the scale question uses the Heading role.
- **Active:** the h1 is visually hidden (screen readers still hear the title), the timer is the display and the step is Lead. The accent dot is removed, and Stop is a secondary button.
- **Return:** "What happened?" is visually hidden, so the first question is the visible heading. Answered questions step down to Meta. "I didn't start" sits under the first question until it is answered, then moves to the bottom.
- **Observation:** the copy is Lead sans ink instead of 24px muted serif.
- **Atlas:** encounter details are a labeled definition list.
- **Verified:** `tsc` is clean, 72/72 tests pass, and there's no horizontal overflow at 320px.

**Not done (open):**
- The global notice banner still sits above the setup content.
- On the offline path, the setup h1 still reads "Choose Your Own Step". It's now hidden on Active, but the heading itself is still an instruction.
- "Something else" is still preselected on Clarify. That comes from `infer()` returning `other` when it isn't confident, and changing it touches validation.
- Begin is still just below the fold on setup at 390x844 when the offline notice shows.
- The wordmark position still varies by screen.
- The Explore label is unchanged (UX.md names it).
- The login page (`server/auth.ts`) is untouched.
- The 0 to 10 scale keeps its deliberate 6+5 wrap below 700px (the 44px touch-target decision documented in the CSS).

## 8. Density pass

Rules applied (sources: NN/g progressive disclosure and cognitive load, Cowan 2001, Krug, GOV.UK one thing per page, Apple State of Mind, Daylio, How We Feel):

- Three gaps only: `--space-in` 8px inside a group, `--space-pair` 16px from a heading to its content, `--space-group` 40px between groups. Each is at least double the one before. Divider rules replaced by whitespace.
- One open question at a time. UX.md keeps Return on one progressively revealed screen, so an answered question collapses to a summary row with Change (focus moves to the reopened question).
- Explanations that are only new once are shown once: the setup mechanic note appears only before the first encounter.
- Optional inputs sit behind a link until wanted: the prediction note, and the Clarify "What makes it hard?" field, which waits for an explicit Something else pick instead of opening because it was preselected.
- Tertiary actions go below the primary (Edit what I'm avoiding, I didn't start).
- Copy cut: Me went from three paragraphs to two short ones; the stale "small set of editable suggestions" line was replaced with the accurate transmission boundary.

Measured at 390x844: Clarify 1117px to 931px; Return (all answered) 1345px to 996px, 85 to 61 words; Me 76 to 55 words.

Not done, and why: splitting Setup or Return into separate screens (the research default) conflicts with DESIGN.md/UX.md; a slider in place of the 0 to 10 grid conflicts with UX.md's eleven labeled choices.
