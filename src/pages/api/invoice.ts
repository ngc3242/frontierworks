import type { APIRoute } from 'astro';
import { validateSession, getSessionCookieName } from '../../lib/auth';
import { validateInvoiceData } from '../../lib/validators';
import { issueInvoice } from '../../lib/volta-client';
import type { InvoiceRequest } from '../../lib/volta-client';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Auth check
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

  try {
    const body = await request.json();

    // Validate input
    const validation = validateInvoiceData(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ message: validation.errors.join(', ') }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Issue invoice via Volta API
    const invoiceData: InvoiceRequest = {
      bizNumber: String(body.bizNumber).replace(/-/g, ''),
      companyName: String(body.companyName).trim(),
      ceoName: String(body.ceoName).trim(),
      address: body.address ? String(body.address).trim() : undefined,
      bizType: body.bizType ? String(body.bizType).trim() : undefined,
      bizCategory: body.bizCategory ? String(body.bizCategory).trim() : undefined,
      email: String(body.email).trim(),
      issueDate: String(body.issueDate),
      itemName: body.itemName ? String(body.itemName).trim() : undefined,
      supplyAmount: Number(body.supplyAmount),
      taxAmount: Number(body.taxAmount),
      totalAmount: Number(body.totalAmount),
      notes: body.notes ? String(body.notes).trim() : undefined,
    };

    const result = await issueInvoice(invoiceData);

    if (result.success) {
      return new Response(JSON.stringify({
        message: result.message,
        invoiceId: result.invoiceId,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: result.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
