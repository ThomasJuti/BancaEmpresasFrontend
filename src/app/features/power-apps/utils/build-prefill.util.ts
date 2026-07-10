import { ClienteFinal } from '../models/cliente-final.model';
import { PowerAppFormValue } from '../models/power-app-submit.model';

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

  const value = emptyFormDefaults({
    leadId: cliente.clienteId,
    identificacionEmpresa: cliente.clienteId,
    nombreEmpresa: cliente.nombre ?? fallbackName ?? '',
    segmento: mapSegmento(cliente.subsegmento),
    cupoDisponibleCec: cliente.cupoDisponible ?? undefined,
    ciudadPuntoEntrega: cliente.ciudad ?? '',
    cupoTarjetaNueva: cliente.cupoDisponible ?? 0,
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

  return { value, prefilledFields };
}
