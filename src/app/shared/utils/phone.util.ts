// Normalización de teléfonos a E.164 para el backend de llamadas (Fonema exige
// ^\+\d{8,15}$). Los datos de Supabase vienen como móvil colombiano de 10
// dígitos (ej. 3224118118), sin indicativo de país.

const E164_PATTERN = /^\+\d{8,15}$/;
const COLOMBIA_CODE = '57';

/** true si el valor ya está en formato E.164 válido. */
export function isValidE164(value: string | null | undefined): boolean {
  return !!value && E164_PATTERN.test(value.trim());
}

/**
 * Convierte un teléfono a E.164 asumiendo Colombia cuando no trae indicativo.
 * Reglas:
 * - Respeta un valor que ya empieza con '+' (solo limpia separadores).
 * - 10 dígitos que inician en 3 (móvil CO) -> +57XXXXXXXXXX.
 * - 12 dígitos que inician en 57 -> +57XXXXXXXXXX.
 * Devuelve null si no se puede normalizar a un E.164 válido.
 */
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
