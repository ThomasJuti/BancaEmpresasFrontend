import { describe, expect, it } from 'vitest';
import { ClienteFinal } from '../models/cliente-final.model';
import {
  applyPipelineFallback,
  buildPrefillFromCliente,
  buildPrefillFromHandoff,
  emptyFormDefaults,
  mapSegmento,
  normalizeNit,
} from './build-prefill.util';

describe('build-prefill.util', () => {
  it('normalizes NIT digits only', () => {
    expect(normalizeNit('901.183-139')).toBe('901183139');
  });

  it('maps segmento variants', () => {
    expect(mapSegmento('PYME 2')).toBe('Pyme mediana');
    expect(mapSegmento('Empresarial 1')).toBe('Empresarial 1');
    expect(mapSegmento('corporativo')).toBe('Corporativo');
    expect(mapSegmento(null)).toBe('');
    expect(mapSegmento('Custom')).toBe('Custom');
  });

  it('returns empty defaults', () => {
    const defaults = emptyFormDefaults({ segmento: 'Pyme' });
    expect(defaults.segmento).toBe('Pyme');
    expect(defaults.binProducto).toBe('491250');
  });

  it('builds prefill from null cliente with fallbacks', () => {
    const { value, prefilledFields } = buildPrefillFromCliente(null, '900', 'Fallback SA');
    expect(value.identificacionEmpresa).toBe('900');
    expect(value.nombreEmpresa).toBe('Fallback SA');
    expect(prefilledFields.size).toBe(0);
  });

  it('builds prefill from cliente', () => {
    const cliente: ClienteFinal = {
      clienteId: '901183139',
      nombre: 'ACME SA',
      subsegmento: 'Pyme',
      cupoDisponible: 5000000,
      representanteLegalNombre: 'Ana Pérez',
      representanteLegalDocumento: '1234567',
      representanteLegalCargo: 'Gerente',
      municipioComercial: 'Bogotá',
      direccionComercial: 'Calle 1',
    };
    const { value, prefilledFields } = buildPrefillFromCliente(cliente);
    expect(value.cupoTarjetaNueva).toBe(5000000);
    expect(value.nombreTarjetahabiente).toBe('Ana Pérez');
    expect(prefilledFields.has('segmento')).toBe(true);
  });

  it('uses leaAprobado when cupoDisponible missing', () => {
    const cliente: ClienteFinal = {
      clienteId: '1',
      leaAprobado: 3000000,
    };
    expect(buildPrefillFromCliente(cliente).value.cupoTarjetaNueva).toBe(3000000);
  });

  it('merges handoff prefill', () => {
    const base = emptyFormDefaults();
    const { value, prefilledFields } = buildPrefillFromHandoff(
      { segmento: 'Empresarial', codigoOficinaCentroServicio: '610' },
      base,
      new Set<string>(),
    );
    expect(value.segmento).toBe('Empresarial');
    expect(value.codigoOficinaCentroServicio).toBe('610');
    expect(prefilledFields.has('segmento')).toBe(true);
  });

  it('skips empty handoff values', () => {
    const base = emptyFormDefaults({ segmento: 'Pyme' });
    const { value } = buildPrefillFromHandoff({ segmento: '', cupoTarjetaNueva: 0 }, base, new Set());
    expect(value.segmento).toBe('Pyme');
  });

  it('applies pipeline fallback for representante', () => {
    const { value, prefilledFields } = applyPipelineFallback(emptyFormDefaults(), new Set(), 'Carlos');
    expect(value.nombreTarjetahabiente).toBe('Carlos');
    expect(prefilledFields.has('nombreTarjetahabiente')).toBe(true);
  });
});
