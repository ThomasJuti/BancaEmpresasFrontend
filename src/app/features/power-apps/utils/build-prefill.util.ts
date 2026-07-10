import { ClienteFinal } from '../models/cliente-final.model';
import { PowerAppFormValue, TipoIdentificacionTarjetahabiente } from '../models/power-app-submit.model';
import { inferTarjetahabienteDocType } from './colombian-id.util';

export function normalizeNit(nit: string): string {
  return nit.replace(/\D/g, '');
}

export function mapSegmento(subsegmento: string | null | undefined): string {
  if (!subsegmento) return '';
  const s = subsegmento.trim().toLowerCase();
  if (s.includes('empresarial 1')) return 'Empresarial 1';
  if (s.includes('empresarial')) return 'Empresarial';
  if (s.includes('pyme 2') || s.includes('pyme 3') || s.includes('pyme 4')) return 'Pyme mediana';
  if (s.includes('pyme')) return 'Pyme';
  if (s.includes('corporativo')) return 'Corporativo';
  return subsegmento;
}

function resolveCupoTarjeta(cliente: ClienteFinal): number {
  if (cliente.cupoDisponible != null && cliente.cupoDisponible > 0) {
    return cliente.cupoDisponible;
  }
  if (cliente.leaAprobado != null && cliente.leaAprobado > 0) {
    return cliente.leaAprobado;
  }
  return 0;
}

export function emptyFormDefaults(overrides?: Partial<PowerAppFormValue>): PowerAppFormValue {
  return {
    segmento: '',
    tipoIdentificacionEmpresa: 'NIT',
    tipoIdentificacionTarjetahabiente: 'CC',
    numeroIdentificacionTarjetahabiente: '',
    unidadNegocios: 'Banca Empresas',
    tipoTarjetaNueva: 'LATAM BUSINESS',
    identificacionEmpresa: '',
    nombreEmpresa: '',
    nombreTarjetahabiente: '',
    binProducto: '491250',
    cargoDebitoAutomatico: '',
    cupoTarjetaNueva: 0,
    archivosAdjuntos: [],
    codigoOficinaCentroServicio: '',
    ciudadPuntoEntrega: '',
    direccionPuntoComercial: '',
    puntoEntrega: 'PUNTO_ENTREGA_A_COMERCIAL',
    ...overrides,
  };
}

export function buildPrefillFromCliente(
  cliente: ClienteFinal | null,
  fallbackNit?: string,
  fallbackName?: string,
): { value: PowerAppFormValue; prefilledFields: Set<string> } {
  const prefilledFields = new Set<string>();

  if (!cliente) {
    const value = emptyFormDefaults({
      identificacionEmpresa: fallbackNit ?? '',
      nombreEmpresa: fallbackName ?? '',
    });
    return { value, prefilledFields };
  }

  const ciudadEntrega = cliente.municipioComercial?.trim() || cliente.ciudad?.trim() || '';
  const cupoTarjeta = resolveCupoTarjeta(cliente);
  const docTarjetahabiente = cliente.representanteLegalDocumento?.trim() ?? '';
  const tipoDoc: TipoIdentificacionTarjetahabiente = docTarjetahabiente
    ? inferTarjetahabienteDocType(docTarjetahabiente)
    : 'CC';

  const value = emptyFormDefaults({
    leadId: cliente.clienteId,
    identificacionEmpresa: cliente.clienteId,
    nombreEmpresa: cliente.nombre ?? fallbackName ?? '',
    segmento: mapSegmento(cliente.subsegmento),
    cupoDisponibleCec: cliente.cupoDisponible ?? cliente.leaAprobado ?? undefined,
    ciudadPuntoEntrega: ciudadEntrega,
    cupoTarjetaNueva: cupoTarjeta,
    nombreTarjetahabiente: cliente.representanteLegalNombre?.trim() ?? '',
    numeroIdentificacionTarjetahabiente: docTarjetahabiente,
    tipoIdentificacionTarjetahabiente: tipoDoc,
    cargoDebitoAutomatico: cliente.representanteLegalCargo?.trim() ?? '',
    direccionPuntoComercial: cliente.direccionComercial?.trim() ?? '',
  });

  prefilledFields.add('leadId');
  prefilledFields.add('identificacionEmpresa');
  if (value.nombreEmpresa) prefilledFields.add('nombreEmpresa');
  if (value.segmento) prefilledFields.add('segmento');
  if (value.cupoDisponibleCec != null) {
    prefilledFields.add('cupoDisponibleCec');
    prefilledFields.add('cupoTarjetaNueva');
  }
  if (value.ciudadPuntoEntrega) prefilledFields.add('ciudadPuntoEntrega');
  if (value.nombreTarjetahabiente) prefilledFields.add('nombreTarjetahabiente');
  if (value.numeroIdentificacionTarjetahabiente) {
    prefilledFields.add('numeroIdentificacionTarjetahabiente');
    prefilledFields.add('tipoIdentificacionTarjetahabiente');
  }
  if (value.cargoDebitoAutomatico) prefilledFields.add('cargoDebitoAutomatico');
  if (value.direccionPuntoComercial) prefilledFields.add('direccionPuntoComercial');

  return { value, prefilledFields };
}
