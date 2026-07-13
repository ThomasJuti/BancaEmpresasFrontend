import { describe, expect, it } from 'vitest';
import { PowerAppSubmitRequest } from '../models/power-app-submit.model';
import {
  hasBlockingValidationIssues,
  validatePowerAppClient,
} from './power-app-client-validator';

function validRequest(overrides: Partial<PowerAppSubmitRequest> = {}): PowerAppSubmitRequest {
  return {
    segmento: 'Pyme',
    tipoIdentificacionEmpresa: 'NIT',
    tipoIdentificacionTarjetahabiente: 'CC',
    numeroIdentificacionTarjetahabiente: '1234567',
    unidadNegocios: 'Banca Empresas',
    tipoTarjetaNueva: 'LATAM BUSINESS',
    identificacionEmpresa: '901183139',
    nombreEmpresa: 'ACME',
    nombreTarjetahabiente: 'Ana',
    binProducto: '491250',
    cargoDebitoAutomatico: 'Gerente',
    cupoTarjetaNueva: 1000000,
    archivosAdjuntos: ['cert.pdf'],
    codigoOficinaCentroServicio: '610',
    ciudadPuntoEntrega: 'Bogotá',
    direccionPuntoComercial: 'Calle 1',
    puntoEntrega: 'PUNTO_ENTREGA_A_COMERCIAL',
    ...overrides,
  };
}

describe('power-app-client-validator', () => {
  it('passes valid request', () => {
    expect(validatePowerAppClient(validRequest())).toEqual([]);
    expect(hasBlockingValidationIssues([])).toBe(false);
  });

  it('detects duplicate identifications', () => {
    const issues = validatePowerAppClient(
      validRequest({ identificacionEmpresa: '1234567', numeroIdentificacionTarjetahabiente: '1234567' }),
    );
    expect(issues.some((i) => i.code === 'DUPLICATE_IDENTIFICATION')).toBe(true);
  });

  it('detects swapped NIT and cedula', () => {
    const issues = validatePowerAppClient(
      validRequest({
        identificacionEmpresa: '1234567',
        numeroIdentificacionTarjetahabiente: '901183139',
        tipoIdentificacionTarjetahabiente: 'CC',
      }),
    );
    expect(issues.some((i) => i.code === 'FIELD_SWAP_NIT_CEDULA')).toBe(true);
  });

  it('validates invalid empresa NIT format', () => {
    const issues = validatePowerAppClient(validRequest({ identificacionEmpresa: '12345' }));
    expect(issues.some((i) => i.field === 'identificacionEmpresa')).toBe(true);
  });

  it('validates tarjetahabiente document by type', () => {
    const issues = validatePowerAppClient(
      validRequest({ numeroIdentificacionTarjetahabiente: '9012345678', tipoIdentificacionTarjetahabiente: 'CC' }),
    );
    expect(issues.some((i) => i.field === 'numeroIdentificacionTarjetahabiente')).toBe(true);
  });

  it('validates BIN producto', () => {
    expect(validatePowerAppClient(validRequest({ binProducto: '123' })).length).toBeGreaterThan(0);
    expect(validatePowerAppClient(validRequest({ binProducto: '549166' })).some((i) => i.code === 'BIN_PRODUCTO_INVALIDO')).toBe(false);
    expect(validatePowerAppClient(validRequest({ binProducto: '111111' })).some((i) => i.code === 'BIN_PRODUCTO_INVALIDO')).toBe(true);
  });

  it('validates cupo', () => {
    expect(validatePowerAppClient(validRequest({ cupoTarjetaNueva: 0 })).some((i) => i.code === 'CUPO_INVALIDO')).toBe(true);
    expect(
      validatePowerAppClient(validRequest({ cupoTarjetaNueva: 2000000, cupoDisponibleCec: 1000000 })).some(
        (i) => i.code === 'CUPO_EXCEDE_DISPONIBLE',
      ),
    ).toBe(true);
  });

  it('requires PDF attachments', () => {
    expect(validatePowerAppClient(validRequest({ archivosAdjuntos: [] })).some((i) => i.code === 'ADJUNTOS_REQUERIDOS')).toBe(true);
    expect(
      validatePowerAppClient(validRequest({ archivosAdjuntos: ['doc.txt'] })).some((i) => i.code === 'ADJUNTOS_REQUERIDOS'),
    ).toBe(true);
  });

  it('validates office code and segmento', () => {
    expect(
      validatePowerAppClient(validRequest({ codigoOficinaCentroServicio: 'ab' })).some((i) => i.field === 'codigoOficinaCentroServicio'),
    ).toBe(true);
    const segIssues = validatePowerAppClient(validRequest({ segmento: 'invalido' }));
    expect(segIssues.some((i) => i.severity === 'warning')).toBe(true);
  });

  it('detects blocking issues', () => {
    expect(hasBlockingValidationIssues([{ code: 'X', field: 'f', message: 'm', severity: 'warning' }])).toBe(false);
    expect(hasBlockingValidationIssues([{ code: 'X', field: 'f', message: 'm', severity: 'error' }])).toBe(true);
  });
});
