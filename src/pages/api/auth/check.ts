import type { APIRoute } from 'astro';
import { validateSession, getSessionCookieName } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieName = getSessionCookieName();
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const token = match?.[1];

  const authenticated = await validateSession(token);
  return new Response(JSON.stringify({ authenticated }), {
    status: authenticated ? 200 : 401,
    headers: { 'Content-Type': 'application/json' },
  });
};
