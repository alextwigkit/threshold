# Threshold: design contract

Read [HANDOFF.md](HANDOFF.md) for release status and verification
boundaries. This document records the visual direction and the layout rules
that came out of the usability rethink (see [UX.md](UX.md) for the vocabulary
rules and per-screen job and primary action).

## Foundation

Contemporary Personal Atlas: warm neutral ground, editorial serif, humanist
sans, fine charcoal linework, quiet terracotta. This is the locked direction,
not a starting point for another redesign.

## Tokens

- Ground: #FCF9F4; secondary surface: #F3F0EB.
- Ink: #20211E; muted text: #50534E; hairline: #DFDDD6.
- Accent: #AC3D24 (selected controls, the primary route, the result heading);
  use #C85235 only where contrast is not needed for small text.
- Display: Newsreader when bundled; Georgia fallback. Functional text: a
  restrained humanist sans; do not introduce Inter by default.
- Primary action: solid ink, warm white text, about 52px high, modest radius.
  Form surfaces are softly separated; no floating card stacks.

## Type roles

Six roles, each a `--text-*` token; every font-size in the app uses one of
them, or inherits (exceptions: the timer's short-screen size, and glyphs
sized in em against their own label).

| Role | Face / size / weight | Used for |
| --- | --- | --- |
| Display | serif 54/400 | the timer only |
| Title | serif 30/400 | one per screen (h1) |
| Heading | serif 20/400 | sections and groups (h2/h3) |
| Lead | sans 24/400, ink | what to read: the step, the result comparison, the step field |
| Body | sans 16/400, buttons 500 | text, options, buttons |
| Meta | sans 14/400, `--meta-foreground` (#666a62, 5.26:1 on the background) | context, dates, counts, hints, dot labels, nav, wordmark |

Rules: Title is 1.5x Heading; only buttons and choice chips carry weight 500,
everything else here is 400; no uppercase and no positive letter-spacing
anywhere (the serif roles keep their own negative tracking); one link style,
underlined, at the size of its surrounding text; serif is reserved for
Display, Title and Heading so it always signals structure. See Layout rules
below for the gap scale that spaces these roles apart.

## Layout rules

- **One focal element per screen.** Judge the whole screen, not each part in
  isolation; rank it tier 1, tier 2, background before building or changing
  it (see UX.md's screen list for the ranking each screen must hit).
- **Emphasis is zero-sum.** Size, weight, contrast, tint and borders all draw
  from the same budget. Spend it on tier 1; demote or delete supporting copy
  rather than adding a second loud element.
- **The gap scale has four steps**, set as custom properties: `--space-in`
  (8px, between an element and its own label or hint), `--space-pair` (16px,
  between two closely related lines, such as a heading and the text right
  under it), `--space-block` (24px, between a block and the next distinct
  block on the same screen), and `--space-group` (40px, between a screen's
  major sections, such as the next step and the progress section on Home).
  Demote an element by shrinking its size or contrast, never by shrinking a
  gap; a cramped screen is a hierarchy bug even if the ranking is right.
- **Adjacent heading levels differ by at least 1.25x** in size or weight, so
  a heading and a sub-heading are never mistaken for the same rank.
- **The primary action is visible without scrolling**, at 390x844 and
  375x667; 320x568 is best effort only, since the narrowest devices are rare
  in this app's audience. If the primary action does not fit above the fold,
  cut or move content rather than compress the gap scale. On Clarify, Your
  step and Before you start the primary is pinned to the bottom of the
  viewport while the content scrolls, and settles into flow at the end.
- **A tinted box must earn its place.** Reserve tinted surfaces (pattern
  cards, panels) for content that genuinely needs to be set apart; a form
  section or a quiet aside does not get one by default.

## Composition

Start is an editorial question plus a large natural input, not a hero page.
Your step centers the editable step text as the largest type on the screen,
with the why line or hint quietly underneath. Before you start leads with
the discomfort scale, with the worry field visible below it. Timer centers
the ring and the time, with "I'm done" reachable without scrolling. Result
gives the comparison or the pattern first, and Done second. Home puts the
next step above progress; Home, History and Your data sit in spare bottom
navigation.

## The worry line

Result and History entries for a step that named a worry show a quiet line:
the person's own words in meta color, quoted, then what happened in ordinary
body text; never a generated summary of the worry. A worry pattern's evidence
is one figure ("in 3 of the 4 steps where you found out, your worry didn't
happen"), not the expected-to-felt numbers used elsewhere; its scope line
names the situation's kind of difficulty in plain words (for example, "steps
where you were worried how someone would react"), never an internal
territory name.

## Row of dots (the former trail)

Home and Result show a row of dots: one per step taken, oldest first. Every
mark encodes a stored field; nothing is placed for decoration. Order along
the row is when the step happened; the numbers under a dot are expected then
felt discomfort; a solid or half-filled dot means completed or stopped
partway (never a failure mark); a ring marks the dot that established a
pattern. Only the latest four dots show on Home, with earlier steps collapsed
into "+N earlier" that opens History; Result shows the full row, muted, with
no caption words and no tap interaction. Not starting leaves no dot.

A short dot settle, about 400 to 800ms, can provide curiosity and
satisfaction, but never an endless pulse or a mandatory wait. Respect
prefers-reduced-motion; information remains understandable with animation
disabled.

## Review checklist

Check 320, 390 and 375px widths, desktop, keyboard, 200% text and reduced
motion before release. After a visual change, screenshot each changed screen
at mobile size (plain and blurred with `filter: blur(7px)`), and get a blind
hierarchy read from a fresh reviewer against the intended tier-1/tier-2
ranking; NOT READY blocks calling a screen finished. A technically built
screen is not proof of visual or device QA.
