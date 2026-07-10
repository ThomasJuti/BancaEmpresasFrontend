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
  if (normalized.startsWith('PA') || normalized.length > 10) {
    return 'PA';
  }
  if (normalized.length > 8) {
    return 'CE';
  }
  return 'CC';
}

export function looksLikeNaturalPersonDocument(value: string): boolean {
  const id = normalizeIdentification(value);
  if (!/^\d{6,10}$/.test(id)) return false;
  if (id.length >= 9 && /^[89]\d{8,9}$/.test(id)) return false;
  return true;
}
