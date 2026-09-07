# Live inference integration — prepared, not activated

The server-only boundary is in `server/inference.ts`, with a framework-neutral HTTP handler in `server/handler.ts`. These files are not imported into the client, routed publicly, or included in the static deployment. The published app remains device-local and makes no model requests.

## Prepared contract
- Exact enum/schema output; no model-authored UI titles, observations or discoveries.
- Model selects a reviewed template and a noun phrase copied verbatim from the user's situation.
- Confirmed resistance wins; invalid, contradictory or ungrounded output is rejected.
- Tentative secondary territory does not unlock geography.
- Missing authentication, wrong origin, invalid consent, oversized input and exhausted quota fail before the provider call.
- Provider keys and model configuration stay server-side. Deadline is eight seconds; refusal, truncation, invalid output and service failure fall back without exposing provider messages.
- Only the current situation and confirmed resistance are sent. No Atlas history, name, email, prediction notes or raw prior encounters are transmitted.
- Requests use `store:false`. This is not a zero-retention promise; provider retention must be disclosed accurately before activation.

## Required activation work
1. Enable the OpenAI Developers plugin and its `openai-platform-api-key` skill for secure provider setup. No API key or model environment variable is currently configured on Edge.
2. Upgrade and re-audit server runtime dependencies before replacing the current static-only deployment.
3. Bind the handler behind verified Sites authentication. Trusted identity must come from dispatch, never from request JSON. Configure the canonical origin explicitly; do not derive it from untrusted forwarded headers.
4. Provide an atomic, durable per-user quota implementation. The handler requires one; there is no permissive default or per-process substitute.
5. Add opt-in in Me with current provider/retention disclosure; leave first use local by default. Send `edge-inference-2026-09-v1` only after that disclosure is accepted. Do not infer consent from an existing situation entry.
6. Wire the client to request suggestions only when opted in, with cancellation and stale-response protection. A returned local fallback still requires clarification.
7. Run the live evaluation set with synthetic situations before transmitting actual user input. Validate template relevance and slot grounding, not merely JSON shape. Review unsafe/high-stakes ambiguity separately.
8. Deploy privately, then run device/offline/accessibility validation. API responses must never enter the service-worker cache.

## Official reference
Request/response handling follows [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): strict JSON schema format, explicit refusal handling and completed-output validation. The integration is unit-tested with injected responses; no paid or live provider requests have been made.
