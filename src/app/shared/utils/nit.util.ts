export function normalizeNit(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[.\-\s]/g, '').trim();
}

export function matchesNit(
  callNit: string | null | undefined,
  companyNit: string | null | undefined,
): boolean {
  const a = normalizeNit(callNit);
  const b = normalizeNit(companyNit);
  return !!a && !!b && a === b;
}
