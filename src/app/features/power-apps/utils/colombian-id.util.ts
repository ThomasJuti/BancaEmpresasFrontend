/** Utilidades para distinguir NIT empresarial vs documento de persona natural (Colombia). */

export function normalizeIdentification(value: string): string {
  return value.replace(/[.\-\s]/g, '').trim();
}

export function looksLikeEmpresaNit(value: string): boolean {
  const id = normalizeIdentification(value);
  if (!/^\d{9,11}$/.test(id)) return false;

  const base = id.length >= 10 ? id.slice(0, 9) : id;
  return /^[89]\d{8}$/.test(base) || id.length === 9;
}

export function looksLikeNaturalPersonDocument(value: string): boolean {
  const id = normalizeIdentification(value);
  if (!/^\d{6,10}$/.test(id)) return false;
  if (id.length >= 9 && /^[89]\d{8,9}$/.test(id)) return false;
  return true;
}
