import {
  looksLikeEmpresaNit,
  looksLikeNaturalPersonDocument,
  looksLikeTarjetahabienteDocument,
  normalizeIdentification,
} from './colombian-id.util';
import { PowerAppSubmitRequest, ValidationIssue } from '../models/power-app-submit.model';

const SEGMENTOS_ELEGIBLES = new Set([
  'pyme pequeña',
  'pyme mediana',
  'empresarial 1',
  'empresarial',
  'corporativo',
  'pyme',
]);

const BINES_LATAM_BUSINESS = new Set(['491250', '549166']);

function issue(
  code: string,
  field: string,
  message: string,
  suggestion?: string,
  severity: ValidationIssue['severity'] = 'error',
): ValidationIssue {
  return { code, field, message, severity, suggestion };
}

function validateIdentificaciones(request: PowerAppSubmitRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nit = normalizeIdentification(request.identificacionEmpresa);
  const doc = normalizeIdentification(request.numeroIdentificacionTarjetahabiente);

  if (!nit || !doc) {
    return issues;
  }

  if (nit === doc) {
    issues.push(
      issue(
        'DUPLICATE_IDENTIFICATION',
        'identificacionEmpresa',
        'La identificación de la empresa y la del tarjetahabiente son iguales.',
        'La empresa (NIT) y el tarjetahabiente deben ser identificaciones distintas.',
      ),
    );
    return issues;
  }

  const nitLooksLikeCedula =
    looksLikeNaturalPersonDocument(request.identificacionEmpresa) &&
    !looksLikeEmpresaNit(request.identificacionEmpresa);
  const docTipo = request.tipoIdentificacionTarjetahabiente;
  const docLooksLikeNit =
    (docTipo === 'CC' || docTipo === 'TI') &&
    looksLikeEmpresaNit(request.numeroIdentificacionTarjetahabiente) &&
    !looksLikeTarjetahabienteDocument(request.numeroIdentificacionTarjetahabiente, docTipo);

  if (nitLooksLikeCedula && docLooksLikeNit) {
    issues.push(
      issue(
        'FIELD_SWAP_NIT_CEDULA',
        'identificacionEmpresa',
        'Parece que la identificación de la empresa y la del tarjetahabiente están invertidas.',
        `Intercambie los valores: use ${doc} como NIT de empresa y ${nit} como documento del tarjetahabiente.`,
      ),
      issue(
        'FIELD_SWAP_NIT_CEDULA',
        'numeroIdentificacionTarjetahabiente',
        'El número del tarjetahabiente tiene formato de NIT empresarial.',
        'El tarjetahabiente debe ser una persona natural (cédula u otro documento PN).',
      ),
    );
    return issues;
  }

  if (!looksLikeEmpresaNit(request.identificacionEmpresa)) {
    issues.push(
      issue(
        'INVALID_FORMAT',
        'identificacionEmpresa',
        'La identificación de la empresa no tiene un formato válido de NIT.',
        'Verifique que ingresó el NIT de la empresa y no la cédula del tarjetahabiente.',
      ),
    );
  }

  if (
    !looksLikeTarjetahabienteDocument(
      request.numeroIdentificacionTarjetahabiente,
      request.tipoIdentificacionTarjetahabiente,
    )
  ) {
    const suggestionByTipo: Record<string, string> = {
      CC: 'Ingrese la cédula del colaborador o representante designado (6 a 11 dígitos).',
      TI: 'Ingrese el número de tarjeta de identidad (6 a 11 dígitos).',
      CE: 'Ingrese la cédula de extranjería (6 a 15 dígitos).',
      PA: 'Ingrese el pasaporte (5 a 20 caracteres alfanuméricos).',
    };
    issues.push(
      issue(
        'INVALID_FORMAT',
        'numeroIdentificacionTarjetahabiente',
        'El documento del tarjetahabiente no coincide con el tipo seleccionado.',
        suggestionByTipo[request.tipoIdentificacionTarjetahabiente] ??
          'Verifique el tipo y número de documento del tarjetahabiente.',
      ),
    );
  }

  return issues;
}

function validateProducto(request: PowerAppSubmitRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bin = request.binProducto.replace(/\D/g, '');

  if (!/^\d{6}$/.test(bin)) {
    issues.push(issue('INVALID_FORMAT', 'binProducto', 'El BIN del producto debe ser numérico de 6 dígitos.'));
  } else if (!BINES_LATAM_BUSINESS.has(bin)) {
    issues.push(
      issue(
        'BIN_PRODUCTO_INVALIDO',
        'binProducto',
        'El BIN seleccionado no corresponde al producto LATAM Business.',
        'Use el BIN 491250 asociado a Tarjeta de Crédito LATAM Business.',
      ),
    );
  }

  return issues;
}

function validateCupo(request: PowerAppSubmitRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(request.cupoTarjetaNueva) || request.cupoTarjetaNueva <= 0) {
    issues.push(
      issue('CUPO_INVALIDO', 'cupoTarjetaNueva', 'El cupo de la tarjeta nueva debe ser un valor mayor a cero.'),
    );
    return issues;
  }

  if (
    request.cupoDisponibleCec !== undefined &&
    request.cupoDisponibleCec !== null &&
    request.cupoTarjetaNueva > request.cupoDisponibleCec
  ) {
    issues.push(
      issue(
        'CUPO_EXCEDE_DISPONIBLE',
        'cupoTarjetaNueva',
        'El cupo solicitado supera el disponible reportado en CEC.',
        `El cupo máximo disponible es ${request.cupoDisponibleCec.toLocaleString('es-CO')}.`,
      ),
    );
  }

  return issues;
}

function validateEntrega(request: PowerAppSubmitRequest): ValidationIssue[] {
  if (!/^\d{3,4}$/.test(request.codigoOficinaCentroServicio.replace(/\D/g, ''))) {
    return [
      issue(
        'INVALID_FORMAT',
        'codigoOficinaCentroServicio',
        'El código de oficina / centro de servicio debe ser numérico (ej. 610).',
      ),
    ];
  }
  return [];
}

function validateSegmento(request: PowerAppSubmitRequest): ValidationIssue[] {
  const segmento = request.segmento.trim().toLowerCase();
  if (!SEGMENTOS_ELEGIBLES.has(segmento)) {
    return [
      issue(
        'SEGMENTO_NO_ELEGIBLE',
        'segmento',
        'El segmento de la empresa no es elegible para esta campaña.',
        'Segmentos válidos: Pyme, Pyme mediana, Empresarial 1, Empresarial o Corporativo.',
        'warning',
      ),
    ];
  }
  return [];
}

function validateAdjuntos(request: PowerAppSubmitRequest): ValidationIssue[] {
  if (!request.archivosAdjuntos.length) {
    return [
      issue(
        'ADJUNTOS_REQUERIDOS',
        'archivosAdjuntos',
        'Debe adjuntar el certificado de Cámara de Comercio en PDF.',
      ),
    ];
  }

  const hasPdf = request.archivosAdjuntos.some((name) => name.trim().toLowerCase().endsWith('.pdf'));
  if (!hasPdf) {
    return [
      issue(
        'ADJUNTOS_REQUERIDOS',
        'archivosAdjuntos',
        'Debe adjuntar el certificado de Cámara de Comercio en PDF.',
      ),
    ];
  }

  return [];
}

export function validatePowerAppClient(request: PowerAppSubmitRequest): ValidationIssue[] {
  return [
    ...validateIdentificaciones(request),
    ...validateProducto(request),
    ...validateCupo(request),
    ...validateAdjuntos(request),
    ...validateEntrega(request),
    ...validateSegmento(request),
  ];
}

export function hasBlockingValidationIssues(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

export const POWER_APP_FIELD_TAB: Record<string, 'cliente' | 'tarjeta' | 'adjuntos' | 'entrega'> = {
  segmento: 'cliente',
  identificacionEmpresa: 'cliente',
  numeroIdentificacionTarjetahabiente: 'cliente',
  nombreEmpresa: 'cliente',
  nombreTarjetahabiente: 'cliente',
  unidadNegocios: 'cliente',
  tipoIdentificacionTarjetahabiente: 'cliente',
  binProducto: 'tarjeta',
  cupoTarjetaNueva: 'tarjeta',
  cupoDisponibleCec: 'tarjeta',
  cargoDebitoAutomatico: 'tarjeta',
  archivosAdjuntos: 'adjuntos',
  codigoOficinaCentroServicio: 'entrega',
  ciudadPuntoEntrega: 'entrega',
  direccionPuntoComercial: 'entrega',
  puntoEntrega: 'entrega',
};
