# Edge

An offline-capable, mobile-first PWA that turns real-world approach into a personal map.

Start with [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md). The approved latest Stitch screens are preserved in [references/](references/). Product constraints live in PRODUCT.md, UX.md, DESIGN.md and BEHAVIOR_ENGINE.md; the next phases are in IMPLEMENTATION_PLAN.md.

## Current implementation
A complete device-local first-use loop: situation → optional clarification → editable expedition + prediction → real-world action → progressive reflection → observation → map. Atlas preserves encounter evidence and two provisional repeated-evidence discoveries. Me provides export, deletion and installation guidance.

The engine uses reviewed templates and explicit correction. It is intentionally not a finished open-ended inference service. Unsupported situations require the user to supply a concrete action. Only actual reported attempts produce map traces. No production user data is seeded.

## Development
Requires Node 22.13 or newer. Run `npm install`, `npm run dev`. `npm test` runs behavioral rules. `npx tsc --noEmit` checks types. `npm run build` creates static output in dist/client and generates the offline service worker from the exact built asset list. The service worker registers only in production.

Serve dist/client over HTTPS (or localhost) to test installation and offline behavior. Device data belongs to its origin: local preview and hosted preview have separate maps. Export is a portable JSON record; restore merges encounter history after review; sync is not implemented yet.

See VALIDATION.md for verified checks and outstanding release work.
