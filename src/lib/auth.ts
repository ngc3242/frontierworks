// Simple session-based admin authentication
// Uses in-memory Map (sufficient for single admin use case)

const SESSION_COOKIE_NAME = 'fw_admin_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Session {
  createdAt: number;
}

const sessions = new Map<string, Session>();

export function getAdminPassword(): string {
  return import.meta.env.ADMIN_PASSWORD || '';
}

export function createSession(): string {
  const token = crypto.randomUUID();
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

export function validateSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string): void {
  sessions.delete(token);
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
