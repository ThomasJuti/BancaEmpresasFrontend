import { describe, expect, it } from 'vitest';
import {
  inferTarjetahabienteDocType,
  looksLikeEmpresaNit,
  looksLikeNaturalPersonDocument,
  looksLikeTarjetahabienteDocument,
  nitBaseForRuesMatch,
  normalizeEmpresaNit,
  normalizeIdentification,
} from './colombian-id.util';

describe('colombian-id.util', () => {
  it('normalizes identification', () => {
    expect(normalizeIdentification('12.345-678')).toBe('12345678');
  });

  it('computes nit base for RUES', () => {
    expect(nitBaseForRuesMatch('9011831390')).toBe('901183139');
    expect(normalizeEmpresaNit('9011831390')).toBe('901183139');
  });

  it('detects empresa NIT patterns', () => {
    expect(looksLikeEmpresaNit('901183139')).toBe(true);
    expect(looksLikeEmpresaNit('12345')).toBe(false);
  });

  it('infers tarjetahabiente doc type', () => {
    expect(inferTarjetahabienteDocType('AB12345')).toBe('PA');
    expect(inferTarjetahabienteDocType('123456789012')).toBe('CE');
    expect(inferTarjetahabienteDocType('1234567')).toBe('CC');
  });

  it('validates tarjetahabiente documents by type', () => {
    expect(looksLikeTarjetahabienteDocument('1234567', 'CC')).toBe(true);
    expect(looksLikeTarjetahabienteDocument('901183139', 'CC')).toBe(false);
    expect(looksLikeTarjetahabienteDocument('123456', 'CE')).toBe(true);
    expect(looksLikeTarjetahabienteDocument('AB12345', 'PA')).toBe(true);
    expect(looksLikeTarjetahabienteDocument('', 'CC')).toBe(false);
  });

  it('detects natural person documents', () => {
    expect(looksLikeNaturalPersonDocument('1234567')).toBe(true);
    expect(looksLikeNaturalPersonDocument('901183139')).toBe(false);
    expect(looksLikeNaturalPersonDocument('PA12345')).toBe(true);
  });
});
