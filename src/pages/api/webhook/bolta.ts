import type { APIRoute } from 'astro';

export const prerender = false;

interface WebhookSuccess {
  eventType: 'TAX_INVOICE_ISSUANCE_SUCCESS';
  data: {
    issuanceKey: string;
    taxInvoiceUrl: string;
  };
}

interface WebhookFailure {
  eventType: 'TAX_INVOICE_ISSUANCE_FAILURE';
  data: {
    issuanceKey: string;
    cause: {
      code: string;
      message: string;
    };
  };
}

type WebhookPayload = WebhookSuccess | WebhookFailure;

// In-memory store for webhook results (accessible from other endpoints)
// Key: issuanceKey, Value: webhook event data
const webhookStore = new Map<string, {
  status: 'success' | 'failure';
  taxInvoiceUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  receivedAt: string;
}>();

export function getWebhookResult(issuanceKey: string) {
  return webhookStore.get(issuanceKey);
}

export function getAllWebhookResults() {
  return Object.fromEntries(webhookStore);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload: WebhookPayload = await request.json();
    const { eventType, data } = payload;

    console.log(`[Bolta Webhook] ${eventType}:`, JSON.stringify(data));

    if (eventType === 'TAX_INVOICE_ISSUANCE_SUCCESS') {
      webhookStore.set(data.issuanceKey, {
        status: 'success',
        taxInvoiceUrl: data.taxInvoiceUrl,
        receivedAt: new Date().toISOString(),
      });
    } else if (eventType === 'TAX_INVOICE_ISSUANCE_FAILURE') {
      webhookStore.set(data.issuanceKey, {
        status: 'failure',
        errorCode: data.cause.code,
        errorMessage: data.cause.message,
        receivedAt: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// GET endpoint to check webhook status for a specific issuanceKey
export const GET: APIRoute = async ({ url }) => {
  const key = url.searchParams.get('key');
  if (!key) {
    return new Response(JSON.stringify(getAllWebhookResults()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = getWebhookResult(key);
  if (!result) {
    return new Response(JSON.stringify({ status: 'pending' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
