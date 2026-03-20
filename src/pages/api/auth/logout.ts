import type { APIRoute } from 'astro';
import { destroySession, getSessionCookieName, clearSessionCookie } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieName = getSessionCookieName();
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const token = match?.[1];

  if (token) {
    destroySession(token);
  }

  return new Response(JSON.stringify({ message: 'Logged out' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
