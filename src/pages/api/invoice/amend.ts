import type { APIRoute } from 'astro';
import { validateSession, getSessionCookieName } from '../../../lib/auth';
import { amendSupplyCost, amendTermination } from '../../../lib/volta-client';
import type { AmendSupplyCostRequest } from '../../../lib/volta-client';

export const prerender = false;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_REGEX.test(value);
}

function isValidItemName(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 80;
}

function validateChangeSupplyCost(body: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!isValidDate(body.date)) {
    errors.push('date must be YYYY-MM-DD format');
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('items must be a non-empty array');
    return errors;
  }

  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i] as Record<string, unknown>;
    if (!isValidDate(item.date)) {
      errors.push(`items[${i}].date must be YYYY-MM-DD format`);
    }
    if (!isValidItemName(item.name)) {
      errors.push(`items[${i}].name must be 1-80 characters`);
    }
    if (typeof item.supplyCost !== 'number' || !Number.isInteger(item.supplyCost)) {
      errors.push(`items[${i}].supplyCost must be an integer`);
    }
    if (item.tax !== undefined && (typeof item.tax !== 'number' || !Number.isInteger(item.tax))) {
      errors.push(`items[${i}].tax must be an integer if provided`);
    }
  }

  return errors;
}

function validateTermination(body: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!isValidDate(body.date)) {
    errors.push('date must be YYYY-MM-DD format');
  }

  return errors;
}

export const POST: APIRoute = async ({ request }) => {
  // Auth check (same pattern as /api/invoice.ts)
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieName = getSessionCookieName();
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const token = match?.[1];

  if (!validateSession(token)) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as Record<string, unknown>;

    const { type, issuanceKey } = body;

    if (typeof issuanceKey !== 'string' || issuanceKey.trim().length === 0) {
      return new Response(JSON.stringify({ message: 'issuanceKey is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (type === 'changeSupplyCost') {
      const errors = validateChangeSupplyCost(body);
      if (errors.length > 0) {
        return new Response(JSON.stringify({ message: errors.join(', ') }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data: AmendSupplyCostRequest = {
        date: body.date as string,
        items: (body.items as Record<string, unknown>[]).map((item) => ({
          date: item.date as string,
          name: item.name as string,
          supplyCost: item.supplyCost as number,
          ...(item.tax !== undefined ? { tax: item.tax as number } : {}),
        })),
      };

      const result = await amendSupplyCost(issuanceKey as string, data);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (type === 'termination') {
      const errors = validateTermination(body);
      if (errors.length > 0) {
        return new Response(JSON.stringify({ message: errors.join(', ') }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await amendTermination(issuanceKey as string, body.date as string);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ message: 'type must be "changeSupplyCost" or "termination"' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
