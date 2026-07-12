
const E164_PATTERN = /^\+\d{8,15}$/;
const COLOMBIA_CODE = '57';

export function isValidE164(value: string | null | undefined): boolean {
  return !!value && E164_PATTERN.test(value.trim());
}

export function toE164(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const cleaned = '+' + trimmed.slice(1).replace(/\D/g, '');
    return isValidE164(cleaned) ? cleaned : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) {
    const candidate = `+${COLOMBIA_CODE}${digits}`;
    return isValidE164(candidate) ? candidate : null;
  }
  if (digits.length === 12 && digits.startsWith(COLOMBIA_CODE)) {
    const candidate = `+${digits}`;
    return isValidE164(candidate) ? candidate : null;
  }

  return null;
}
