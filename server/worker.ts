import { handleSuggestion } from './handler.ts';
import { consumeQuota, type QuotaDB } from './quota.ts';
export interface Env {
 ASSETS: { fetch(request: Request): Promise<Response> };
 DB: QuotaDB;
 OPENAI_API_KEY?: string;
 OPENAI_MODEL?: string;
}
const origin = 'https://edge-personal-atlas.thenewdeal.chatgpt.site';
export default {
 async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/api/suggestion') {
   // Sites dispatch supplies authenticated identity; the Worker has no public workers.dev route.
   return handleSuggestion(request, {
    userId: url.origin === origin ? request.headers.get('oai-authenticated-user-id') : null,
    trustedOrigin: origin,
    provider: env.OPENAI_API_KEY && env.OPENAI_MODEL ? { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL } : null,
    consumeQuota: user => consumeQuota(env.DB, user),
   });
  }
  if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
  return env.ASSETS.fetch(request);
 }
};
