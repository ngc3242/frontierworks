// Bolta API client for Korean electronic tax invoice (전자세금계산서)
// API docs: https://docs.bolta.io

const BOLTA_BASE_URL = 'https://xapi.bolta.io';

export interface InvoiceRequest {
  // Recipient info
  bizNumber: string;
  companyName: string;
  ceoName: string;
  address?: string;
  bizType?: string;
  bizCategory?: string;
  email: string;
  // Transaction info
  issueDate: string;
  itemName?: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoiceId?: string;
  message: string;
}

// Response type for GET /v1/taxInvoices/{issuanceKey}
export interface InvoiceDetailItem {
  date?: string;
  name?: string;
  supplyCost?: number;
  tax?: number;
  quantity?: number;
  unitPrice?: number;
}

export interface InvoiceDetailParty {
  identificationNumber?: string;
  organizationName?: string;
  representativeName?: string;
  address?: string;
  businessType?: string;
  businessItem?: string;
}

export interface InvoiceDetailResponse {
  issuanceKey: string;
  ntsTransactionId?: string;
  issuedAt?: string;
  invoice: {
    date?: string;
    purpose?: 'RECEIPT' | 'CLAIM';
    supplier?: InvoiceDetailParty;
    supplied?: InvoiceDetailParty;
    items?: InvoiceDetailItem[];
    description?: string;
  };
}

function getBasicAuthHeader(apiKey: string): string {
  // Bolta uses Basic Auth: API key as username, empty password
  const encoded = btoa(`${apiKey}:`);
  return `Basic ${encoded}`;
}

// Fetch invoice detail by issuance key from Bolta API
export async function getInvoiceDetail(issuanceKey: string): Promise<InvoiceDetailResponse> {
  const apiKey = import.meta.env.VOLTA_API_KEY;
  const customerKey = import.meta.env.BOLTA_CUSTOMER_KEY;

  if (!apiKey || apiKey === 'your_volta_api_key') {
    return {
      issuanceKey,
      ntsTransactionId: `NTS-MOCK-${Date.now()}`,
      issuedAt: new Date().toISOString(),
      invoice: {
        date: new Date().toISOString().slice(0, 10),
        purpose: 'RECEIPT',
        supplier: {},
        supplied: {},
        items: [],
        description: 'Mock mode - API key not configured',
      },
    };
  }

  const headers: Record<string, string> = {
    'Authorization': getBasicAuthHeader(apiKey),
  };
  if (customerKey) {
    headers['Customer-Key'] = customerKey;
  }

  const response = await fetch(`${BOLTA_BASE_URL}/v1/taxInvoices/${encodeURIComponent(issuanceKey)}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(error.message || `Bolta API error: ${response.status}`);
  }

  const result = await response.json();
  return result as InvoiceDetailResponse;
}

// --- Amendment types ---

export interface AmendSupplyCostItem {
  date: string;
  name: string;
  supplyCost: number;
  tax?: number;
}

export interface AmendSupplyCostRequest {
  date: string;
  items: AmendSupplyCostItem[];
}

export interface AmendResponse {
  issuanceKey: string;
}

// --- Amendment functions ---

export async function amendSupplyCost(
  issuanceKey: string,
  data: AmendSupplyCostRequest,
): Promise<AmendResponse> {
  const apiKey = import.meta.env.VOLTA_API_KEY;
  const customerKey = import.meta.env.BOLTA_CUSTOMER_KEY;

  if (!apiKey || apiKey === 'your_volta_api_key') {
    console.log('[Bolta Mock] Amend supply cost:', JSON.stringify({ issuanceKey, ...data }, null, 2));
    return { issuanceKey: `MOCK-AMEND-${Date.now()}` };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': getBasicAuthHeader(apiKey),
  };
  if (customerKey) {
    headers['Customer-Key'] = customerKey;
  }

  const response = await fetch(
    `${BOLTA_BASE_URL}/v1/taxInvoices/${encodeURIComponent(issuanceKey)}/amend/changeSupplyCost`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(error.message || `Bolta API error: ${response.status}`);
  }

  return response.json();
}

export async function amendTermination(
  issuanceKey: string,
  date: string,
): Promise<AmendResponse> {
  const apiKey = import.meta.env.VOLTA_API_KEY;
  const customerKey = import.meta.env.BOLTA_CUSTOMER_KEY;

  if (!apiKey || apiKey === 'your_volta_api_key') {
    console.log('[Bolta Mock] Amend termination:', JSON.stringify({ issuanceKey, date }, null, 2));
    return { issuanceKey: `MOCK-TERM-${Date.now()}` };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': getBasicAuthHeader(apiKey),
  };
  if (customerKey) {
    headers['Customer-Key'] = customerKey;
  }

  const response = await fetch(
    `${BOLTA_BASE_URL}/v1/taxInvoices/${encodeURIComponent(issuanceKey)}/amend/termination`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ date }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(error.message || `Bolta API error: ${response.status}`);
  }

  return response.json();
}

// --- Invoice issuance ---

export async function issueInvoice(data: InvoiceRequest): Promise<InvoiceResponse> {
  const apiKey = import.meta.env.VOLTA_API_KEY;
  const customerKey = import.meta.env.BOLTA_CUSTOMER_KEY;

  if (!apiKey || apiKey === 'your_volta_api_key') {
    console.log('[Bolta Mock] Invoice request:', JSON.stringify(data, null, 2));
    return {
      success: true,
      invoiceId: `MOCK-${Date.now()}`,
      message: 'Mock mode - API key not configured',
    };
  }

  const supplyCost = data.supplyAmount;
  const tax = data.taxAmount;

  const requestBody = {
    date: data.issueDate,
    purpose: 'RECEIPT' as const,
    supplier: {
      identificationNumber: import.meta.env.SUPPLIER_BIZ_NO,
      organizationName: import.meta.env.SUPPLIER_COMPANY_NAME,
      representativeName: import.meta.env.SUPPLIER_CEO_NAME,
      address: import.meta.env.SUPPLIER_ADDRESS || undefined,
      businessType: import.meta.env.SUPPLIER_BIZ_TYPE || undefined,
      businessItem: import.meta.env.SUPPLIER_BIZ_CLASS || undefined,
      manager: {
        email: import.meta.env.SUPPLIER_EMAIL || data.email,
      },
    },
    supplied: {
      identificationNumber: data.bizNumber.replace(/-/g, ''),
      organizationName: data.companyName,
      representativeName: data.ceoName,
      address: data.address || undefined,
      businessType: data.bizType || undefined,
      businessItem: data.bizCategory || undefined,
      managers: [
        { email: data.email },
      ],
    },
    items: [
      {
        date: data.issueDate,
        name: data.itemName || 'Service',
        supplyCost,
        tax: tax > 0 ? tax : undefined,
      },
    ],
    description: data.notes || undefined,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': getBasicAuthHeader(apiKey),
  };
  if (customerKey) {
    headers['Customer-Key'] = customerKey;
  }

  try {
    const response = await fetch(`${BOLTA_BASE_URL}/v1/taxInvoices/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        invoiceId: result.issuanceKey,
        message: 'Invoice issued successfully',
      };
    }

    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    return {
      success: false,
      message: error.message || `Bolta API error: ${response.status}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
