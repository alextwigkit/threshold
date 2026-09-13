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

export function loginPage(
  error?: string,
  status = error ? 401 : 200,
): Response {
  return new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Threshold</title>
<style>
body{font-family:Georgia,serif;background:#FCF9F4;color:#40443b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
form{max-width:320px;width:100%;padding:24px}
h1{font-size:22px;text-align:center;font-weight:normal;font-style:italic}
input{width:100%;padding:10px;margin-bottom:12px;font-size:16px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;font-family:inherit}
button{width:100%;padding:10px;font-size:16px;background:#40443b;color:#FCF9F4;border:none;border-radius:4px;cursor:pointer}
.error{color:#ac3d24;font-size:14px;margin:0 0 12px}
</style></head><body>
<form method="POST" action="/login">
<h1>Threshold</h1>
${error ? `<p class="error">${error}</p>` : ''}
<input name="username" placeholder="Username" autocomplete="username" required autofocus>
<input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Sign in</button>
</form></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
