import { handleSuggestion } from './handler.ts';
import { consumeQuota, type QuotaDB } from './quota.ts';
import {
  findUser,
  verifyPassword,
  createSession,
  verifySession,
  sessionCookie,
  clearSessionCookie,
  readSessionCookie,
  recordLoginAttempt,
  loginPage,
  type UsersDB,
  type AttemptsDB,
} from './auth.ts';
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: QuotaDB & UsersDB & AttemptsDB;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  SESSION_SECRET: string;
}
async function handleLogin(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  // A file upload here would stringify to "[object File]"; treat anything but a plain
  // string field as absent rather than let it flow through as garbage credentials.
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  const username = field('username').trim();
  const password = field('password');
  // Recorded before the password is even checked: a locked-out identity can't burn
  // attempts probing whether the account exists, only whether it's currently rate-limited.
  const permitted = await recordLoginAttempt(env.DB, username || 'unknown');
  if (!permitted)
    return loginPage('Too many attempts. Try again tomorrow.', 429);
  const user = username ? await findUser(env.DB, username) : null;
  const valid = user
    ? await verifyPassword(password, user.salt, user.password_hash)
    : false;
  if (!valid) return loginPage('Incorrect username or password.');
  const token = await createSession(username, env.SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: { Location: '/', 'Set-Cookie': sessionCookie(token) },
  });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/login') {
      if (request.method === 'GET') return loginPage();
      if (request.method === 'POST') return handleLogin(request, env);
      return new Response('Method not allowed', { status: 405 });
    }
    if (url.pathname === '/logout') {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login', 'Set-Cookie': clearSessionCookie() },
      });
    }
    // The login page needs the app's own typeface to look like the app, not a
    // generic fallback font — fonts carry no user data, so they're public.
    if (url.pathname.startsWith('/fonts/')) return env.ASSETS.fetch(request);
    // The login page now declares itself PWA-capable (manifest link, icons) so
    // an installed home-screen launch that lands here while signed out stays
    // in standalone mode instead of iOS dropping to an in-app Safari view.
    // None of these carry user data, so — like fonts — they're public.
    const publicShellAssets = new Set([
      '/manifest.webmanifest',
      '/icon.svg',
      '/icon-192.png',
      '/icon-512.png',
    ]);
    if (publicShellAssets.has(url.pathname)) return env.ASSETS.fetch(request);
    // Every other route — static assets and /api/* alike — requires a valid session. This is
    // the direct replacement for the old oai-authenticated-user-id trust: there is no dispatcher
    // in front of this Worker anymore, so the Worker itself must gate everything.
    const userId = await verifySession(
      readSessionCookie(request),
      env.SESSION_SECRET,
    );
    if (!userId) {
      if (url.pathname.startsWith('/api/'))
        return new Response(JSON.stringify({ error: 'sign_in_required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' },
      });
    }
    if (url.pathname === '/api/suggestion') {
      return handleSuggestion(request, {
        userId,
        provider:
          env.OPENAI_API_KEY && env.OPENAI_MODEL
            ? { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL }
            : null,
        consumeQuota: (user) => consumeQuota(env.DB, user),
      });
    }
    if (url.pathname.startsWith('/api/'))
      return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
