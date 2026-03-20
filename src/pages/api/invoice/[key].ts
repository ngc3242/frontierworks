import type { APIRoute } from 'astro';
import { validateSession, getSessionCookieName } from '../../../lib/auth';
import { getInvoiceDetail } from '../../../lib/volta-client';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  // Auth check (same pattern as existing invoice endpoint)
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieName = getSessionCookieName();
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const token = match?.[1];

  if (!await validateSession(token)) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { key } = params;

  if (!key || key.trim() === '') {
    return new Response(JSON.stringify({ message: 'Missing issuance key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const detail = await getInvoiceDetail(key);

    return new Response(JSON.stringify(detail), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch invoice detail';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
