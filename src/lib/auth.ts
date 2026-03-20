// Stateless admin authentication using signed cookies
// Works on Vercel Serverless (no shared memory between invocations)

const SESSION_COOKIE_NAME = 'fw_admin_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getAdminPassword(): string {
  return import.meta.env.ADMIN_PASSWORD || '';
}

function getSecret(): string {
  // Use ADMIN_PASSWORD as HMAC secret (single admin, no separate secret needed)
  return getAdminPassword();
}

async function hmacSign(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(message);
  return expected === signature;
}

/** Create a signed session token: timestamp.signature */
export async function createSession(): Promise<string> {
  const timestamp = String(Date.now());
  const signature = await hmacSign(timestamp);
  return `${timestamp}.${signature}`;
}

/** Validate a signed session token */
export async function validateSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const valid = await hmacVerify(timestamp, signature);
  if (!valid) return false;

  const createdAt = Number(timestamp);
  if (isNaN(createdAt)) return false;
  if (Date.now() - createdAt > SESSION_TTL_MS) return false;

  return true;
}

export function destroySession(_token: string): void {
  // Stateless: nothing to destroy server-side
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
