/** Deployment adapter must supply a VERIFIED platform identity. Never trust a browser-provided ID. */
import { candidate } from '../lib/engine.ts';
import {
  parseInput,
  requestSuggestion,
  type ProviderConfig,
} from './inference.ts';
import { readBounded } from './transport.ts';
export type ServerContext = {
  userId: string | null;
  provider: ProviderConfig | null;
  consumeQuota: (userId: string) => Promise<boolean>;
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function handleSuggestion(
  request: Request,
  context: ServerContext,
): Promise<Response> {
  if (request.method !== 'POST')
    return json({ error: 'method_not_allowed' }, 405);
  // userId is only ever non-null here because the caller already verified a signed,
  // SameSite=Lax session cookie (see server/worker.ts) — that replaces the old fixed-origin
  // check, and covers CSRF too, without hardcoding a domain into this handler.
  if (!context.userId) return json({ error: 'sign_in_required' }, 401);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'json_required' }, 415);
  let raw: string;
  try {
    raw = await readBounded(request.body, 10000);
  } catch {
    return json({ error: 'input_too_large' }, 413);
  }
  let input;
  try {
    input = parseInput(JSON.parse(raw));
  } catch {
    return json({ error: 'invalid_input' }, 400);
  }
  if (!context.provider) return json({ error: 'provider_unconfigured' }, 503);
  let permitted = false;
  try {
    permitted = await context.consumeQuota(context.userId);
  } catch {
    return json({ error: 'temporarily_unavailable' }, 503);
  }
  if (!permitted) return json({ error: 'try_later' }, 429);
  try {
    return json(await requestSuggestion(input, context.provider));
  } catch (e) {
    // No sensitive exception messages, provider response bodies, or API keys leave the server.
    console.warn(
      'suggestion_fallback',
      e instanceof Error ? e.message : 'unknown',
    );
    const fallback = candidate(
      input.situation,
      input.confirmedResistance ?? 'other',
    );
    return json({
      source: 'local',
      needsClarification: true,
      candidate: {
        ...fallback,
        title: 'Choose Your Own Step',
        action: '',
        secondary: [],
      },
      reason: 'provider_unavailable',
      secondarySuggestions: [],
    });
  }
}
