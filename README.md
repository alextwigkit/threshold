# Edge

> September 12 decision: the owner explicitly requested removing the AI suggestions section and making suggestions always on. Situation/resistance continuation now requests the existing model automatically when online, including on fresh browsers and after local data deletion. The old consent preference is no longer read. Existing minimal payload, API limits, validation and offline fallback remain. Earlier default-off/toggle instructions below are historical and superseded. This authorization applies to the current private personal app.

An offline-capable, mobile-first PWA that turns meaningful real-world approach into a personal map.

**Start with [HANDOFF.md](HANDOFF.md).** It preserves the original conversation, settled decisions, current release, known limitations, and next work. [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) consolidates product direction. The owning constraints are [PRODUCT.md](PRODUCT.md), [UX.md](UX.md), [DESIGN.md](DESIGN.md), and [BEHAVIOR_ENGINE.md](BEHAVIOR_ENGINE.md). The seven approved Stitch screens are in [references/](references/).

## Current implementation

Private version 3 is live at [Edge](https://edge-personal-atlas.thenewdeal.chatgpt.site/). The device-local loop is situation → optional clarification → editable expedition and prediction → real-world action → progressive reflection → observation → map. Atlas preserves encounter evidence and two provisional repeated-evidence discoveries. Me provides export, reviewed restore, deletion, installation guidance, and optional AI consent.

AI suggestions are live and off by default. A server-only OpenAI integration selects reviewed action templates from the current situation and confirmed resistance. Credentials are configured; do not repeat key setup. Observations, discoveries, and Today's Edge remain deterministic and local. See [INFERENCE_INTEGRATION.md](INFERENCE_INTEGRATION.md) for the privacy, authentication, validation, and quota boundaries.

Only actual reported attempts produce approach traces. No production user history is seeded. The engine and map remain subject to the verification and quality gaps in [VALIDATION.md](VALIDATION.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Development

Requires Node 22.13 or newer. Preserve the lockfile and use `npm ci`, then `npm run dev`. Run `npm test` for automated checks and `npx --no-install tsc --noEmit` for types.

`npm run build` creates the static interface in `dist/client`, generates its offline service worker, and packages the separate API Worker. `npm run start` previews the packaged Worker and assets. See the handoff for runtime paths and local preview environment settings. The service worker registers only in production; installation requires HTTPS or localhost. Static asset serving alone does not test the API integration.

Device data belongs to its origin: local and hosted previews have separate maps. Export is portable JSON; restore merges encounter history after review. Cross-device sync is not implemented. D1 stores API quota counters, not the Atlas.

The parent `edge-project.zip` is a portable source snapshot. Credentials, dependencies, and build output are excluded. Documentation changes after the published source commit do not represent a new live release.
