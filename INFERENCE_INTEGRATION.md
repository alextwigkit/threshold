# AI suggestions — live in private version 3

> September 12 decision: the owner explicitly requested removing the AI suggestions section and making suggestions always on. Situation/resistance continuation now requests the existing model automatically when online, including on fresh browsers and after local data deletion. The old consent preference is no longer read. Existing minimal payload, API limits, validation and offline fallback remain. Earlier default-off/toggle instructions below are historical and superseded. This authorization applies to the current private personal app.

Edge retains its static, installable interface and adds a small Cloudflare Worker for `/api/suggestion`. No RSC server or server actions are exposed. The default Worker fetch handler serves compiled assets through ASSETS and routes only the suggestion endpoint.

## Product contract
- AI is off by default. In Me, explicit versioned consent enables transmission of only the current situation and confirmed resistance choice. Preferences is also accessible from first use.
- Predictions, reflections, freeform resistance notes, the Atlas and encounter history stay on the device. Consent is device-local and is neither exported nor restored from backups.
- Model output selects reviewed templates and a noun phrase copied from the situation. UI titles, observations and discoveries remain product-owned.
- Confirmed resistance restricts the model schema and is validated again after generation. Prior user edits and smaller-dose decisions remain local and take precedence.
- Cancel, edit, navigation, disabling consent and cross-tab consent changes invalidate pending results. Offline use continues with the built-in rules.
- Timeouts, refusals, malformed results and exhausted quota allow a user-authored step; provider exceptions never reach the browser.

## Runtime and limits
Sites dispatch supplies authenticated identity. Unauthenticated requests, wrong origins and invalid consent fail before a provider call. The canonical origin is pinned to the existing private Edge site; the Worker must remain behind Sites dispatch without a public workers.dev route.

D1 stores only one quota row per site-specific user: UTC day/month and request counts. A single conditional UPSERT atomically enforces 10 requests per day and 150 per month across concurrent requests. Failed provider calls count. Limits are app request limits, not a billing-account spending cap. Data clearing on the device does not reset server quota.

The API key must be a Sites secret named OPENAI_API_KEY. OPENAI_MODEL is gpt-5.4-mini. Local credentials remain ignored and are excluded from source archives and public bundles. API responses are never cached by the service worker.

## Verification — September 7, 2026
- 43 automated tests pass: behavioral rules, persistence, duplicate evidence, request consent, output validation, correction enforcement, cancellation races, durable quotas and Worker authentication boundaries.
- Six synthetic live evaluations pass after refining template instructions and binding the schema to confirmed resistance: proposal, ordinary reply, formatting loop, ambiguous situation, safety-critical check and explicit correction. Each completed in roughly one second in the final run. This is a bounded smoke evaluation, not a claim of universal reliability.
- Type checking and production build pass. Packaged Worker smoke checks return HTTP 200 for the interface and HTTP 401 for an unauthenticated suggestion request.
- Runtime dependency advisories were resolved. Four remaining moderate advisories belong to the Drizzle migration tool's legacy development dependency; its development server is not used or deployed.
- Signed-in browser verification passed for opt-in, a synthetic situation, model suggestion and prediction selection (including zero). No encounter was recorded. Complete return-flow browser QA, physical-device installation and screen-reader validation remain outstanding.
- Hosted secret configuration and private publication succeeded. The signed-in browser request worked. A gate-bypass token is identity-less and correctly received 401; do not treat that as a provider failure. See HANDOFF.md for exact release IDs.

## Privacy disclosure
Requests use store:false. API data is not used for training by default; abuse-monitoring content can be retained up to 30 days, with exceptions. The opt-in links to [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Do not promise zero retention.
