// Password hashing, session signing and the login-attempt rate limit that together replace
// Sites' trusted-dispatcher identity header for a direct Cloudflare deployment. Everything
// here uses only the Workers-native Web Crypto API — no WASM/bcrypt/argon2 dependency.
const PBKDF2_ITERATIONS = 100_000;
const COOKIE_NAME = 'threshold_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toHex(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
// Constant-time-ish compare: two hex digests are already fixed length, but this avoids an
// early-exit string compare leaking how many leading bytes matched via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(
  password: string,
  saltHex?: string,
): Promise<{ hash: string; salt: string }> {
  const salt = saltHex
    ? fromHex(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)),
  );
}

// Token shape is username.expiry.signature. Not JWT: no header/alg negotiation to get wrong,
// and the only claim this app needs is "who, until when."
export async function createSession(
  username: string,
  secret: string,
  now = Date.now(),
  ttlMs = SESSION_TTL_MS,
): Promise<string> {
  const payload = `${username}.${now + ttlMs}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifySession(
  token: string | null,
  secret: string,
  now = Date.now(),
): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, expiresText, signature] = parts;
  const expires = Number(expiresText);
  if (!username || !Number.isFinite(expires) || expires < now) return null;
  const expected = await hmac(secret, `${username}.${expiresText}`);
  return timingSafeEqual(signature, expected) ? username : null;
}

export function sessionCookie(token: string, ttlMs = SESSION_TTL_MS): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(ttlMs / 1000)}`;
}
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === COOKIE_NAME)
      return part.slice(eq + 1).trim();
  }
  return null;
}

export interface UsersDB {
  prepare(sql: string): {
    bind(...values: string[]): { first(): Promise<unknown> };
  };
}
export type UserRow = { username: string; password_hash: string; salt: string };
export async function findUser(
  db: UsersDB,
  username: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare(
      'SELECT username, password_hash, salt FROM users WHERE username = ?1',
    )
    .bind(username)
    .first();
  return (row as UserRow | undefined) ?? null;
}

// Same atomic increment-with-cap shape as server/quota.ts's consumeQuota, keyed by login
// identity (e.g. the submitted username) instead of a quota user, capped at 10/day.
export const loginAttemptSQL = `INSERT INTO login_attempts (key, day, count)
VALUES (?1, ?2, 1)
ON CONFLICT(key) DO UPDATE SET
 day = excluded.day,
 count = CASE WHEN login_attempts.day = excluded.day THEN login_attempts.count + 1 ELSE 1 END
WHERE (login_attempts.day != excluded.day OR login_attempts.count < 10)
RETURNING count`;
export interface AttemptsDB {
  prepare(sql: string): {
    bind(...values: string[]): { first(): Promise<unknown> };
  };
}
export async function recordLoginAttempt(
  db: AttemptsDB,
  key: string,
  now = new Date(),
): Promise<boolean> {
  const day = now.toISOString().slice(0, 10);
  return !!(await db.prepare(loginAttemptSQL).bind(key, day).first());
}

// Same design tokens and type scale as app/globals.css. This can't import that file
// (it's server-rendered raw HTML, before any client bundle loads), so the values are
// duplicated here on purpose — if the palette or the Newsreader files move, update both.
export function loginPage(
  error?: string,
  status = error ? 401 : 200,
): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fcf9f4">
<link rel="icon" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Threshold">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<title>Threshold</title>
<style>
@font-face{font-family:Newsreader;font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/newsreader-latin-400-normal.woff2) format('woff2')}
*{box-sizing:border-box}
html{-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;padding:24px calc(24px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));background:#fcf9f4;color:#20211e;font-family:'Avenir Next',Avenir,'Segoe UI',sans-serif;font-size:16px;line-height:1.55}
form{max-width:320px;width:100%}
h1{font-family:Newsreader,Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:-0.035em;line-height:1.2;font-size:1.875rem;text-align:center;margin:0 0 32px;color:#20211e}
.field{margin-bottom:16px}
.field-label{display:block;font-weight:500;margin-bottom:8px}
input{width:100%;min-height:48px;padding:12px 14px;font:inherit;font-size:1rem;background:#f5f2ed;border:1px solid #dfddd6;border-radius:6px;color:#20211e}
input::placeholder{color:#8a8c83}
input:focus-visible{outline:2px solid #ac3d24;outline-offset:2px}
.error{padding:12px;border-left:2px solid #ac3d24;margin:0 0 20px;color:#ac3d24;font-size:0.9375rem}
button{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;background:#20211e;color:#fcf9f4;border:0;border-radius:5px;padding:16px 24px;min-height:54px;font:inherit;font-weight:500;margin-top:8px;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;transition:transform 100ms ease-out}
button:focus-visible{outline:2px solid #ac3d24;outline-offset:4px}
button:active{transform:scale(0.98)}
.arrow{font-size:1.5rem;line-height:1}
</style></head><body>
<form method="POST" action="/login">
<h1>Threshold</h1>
${error ? `<p class="error" role="alert">${error}</p>` : ''}
<div class="field">
<label class="field-label" for="username">Username</label>
<input id="username" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" enterkeyhint="next" required autofocus>
</div>
<div class="field">
<label class="field-label" for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" enterkeyhint="go" required>
</div>
<button type="submit">Sign in <span class="arrow" aria-hidden="true">→</span></button>
</form></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
