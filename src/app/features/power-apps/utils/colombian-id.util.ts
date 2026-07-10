/** Utilidades para distinguir NIT empresarial vs documento de persona natural (Colombia). */

import { TipoIdentificacionTarjetahabiente } from '../models/power-app-submit.model';

export function normalizeIdentification(value: string): string {
  return value.replace(/[.\-\s]/g, '').trim();
}

/** Alinea NIT del formulario con el que devuelve RUES (9 dígitos sin verificación). */
export function normalizeEmpresaNit(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && (digits[0] === '8' || digits[0] === '9')) {
    return digits.slice(0, 9);
  }
  return digits;
}

export function looksLikeEmpresaNit(value: string): boolean {
  const id = normalizeIdentification(value);
  if (!/^\d{9,11}$/.test(id)) return false;

  const base = id.length >= 10 ? id.slice(0, 9) : id;
  return /^[89]\d{8}$/.test(base) || id.length === 9;
}

export function inferTarjetahabienteDocType(
  documento: string,
): TipoIdentificacionTarjetahabiente {
  const normalized = normalizeIdentification(documento).toUpperCase();
  if (/^[A-Z]{1,3}\d/.test(normalized) || /[A-Z]/.test(normalized)) {
    return 'PA';
  }
  if (normalized.length > 11) {
    return 'CE';
  }
  if (normalized.length > 10) {
    return 'CE';
  }
  return 'CC';
}

function isNitPattern(id: string): boolean {
  return id.length >= 9 && /^[89]\d{8,10}$/.test(id);
}

export function looksLikeTarjetahabienteDocument(
  value: string,
  tipo: TipoIdentificacionTarjetahabiente = 'CC',
): boolean {
  const id = normalizeIdentification(value).toUpperCase();
  if (!id) return false;

  switch (tipo) {
    case 'CC':
      return /^\d{6,11}$/.test(id) && !isNitPattern(id);
    case 'TI':
      return /^\d{6,11}$/.test(id) && !isNitPattern(id);
    case 'CE':
      return /^\d{6,15}$/.test(id);
    case 'PA':
      return /^[A-Z0-9]{5,20}$/.test(id);
    default:
      return looksLikeNaturalPersonDocument(value);
  }
}

/** Compatibilidad: validación genérica cuando no se conoce el tipo de documento. */
export function looksLikeNaturalPersonDocument(value: string): boolean {
  const id = normalizeIdentification(value).toUpperCase();
  if (/^[A-Z0-9]{5,20}$/.test(id) && /[A-Z]/.test(id)) return true;
  if (!/^\d{6,15}$/.test(id)) return false;
  if (isNitPattern(id)) return false;
  return true;
}
