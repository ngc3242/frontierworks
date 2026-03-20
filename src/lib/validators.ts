// Validation utilities for Korean business data

const BIZ_NUMBER_WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5];

/**
 * Validate Korean business registration number (사업자등록번호)
 * Uses the official 10-digit checksum algorithm.
 */
export function validateBusinessNumber(brn: string): boolean {
  const digits = brn.replace(/\D/g, '');
  if (digits.length !== 10) return false;

  const nums = digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += nums[i] * BIZ_NUMBER_WEIGHTS[i];
  }
  sum += Math.floor((nums[8] * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === nums[9];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate all invoice form fields server-side.
 */
export function validateInvoiceData(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const bizNumber = String(data.bizNumber || '');
  if (!validateBusinessNumber(bizNumber)) {
    errors.push('Invalid business registration number');
  }

  if (!data.companyName || String(data.companyName).trim().length === 0) {
    errors.push('Company name is required');
  }

  if (!data.ceoName || String(data.ceoName).trim().length === 0) {
    errors.push('CEO name is required');
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    errors.push('Valid email is required');
  }

  const supplyAmount = Number(data.supplyAmount);
  if (!Number.isFinite(supplyAmount) || supplyAmount <= 0) {
    errors.push('Supply amount must be a positive number');
  }

  return { valid: errors.length === 0, errors };
}
