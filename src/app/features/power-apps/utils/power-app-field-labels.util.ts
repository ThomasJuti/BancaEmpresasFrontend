import { PowerAppSubmissionPayload } from '../models/power-app-submit.model';

export interface PowerAppFieldEntry {
  key: keyof PowerAppSubmissionPayload | 'archivosAdjuntos' | 'documentoOrigen';
  label: string;
  section: 'cliente' | 'tarjeta' | 'entrega' | 'documentos';
  format?: 'currency' | 'puntoEntrega';
}

export const POWER_APP_FIELD_ENTRIES: PowerAppFieldEntry[] = [
  { key: 'segmento', label: 'Segmento', section: 'cliente' },
  { key: 'identificacionEmpresa', label: 'NIT empresa', section: 'cliente' },
  { key: 'nombreEmpresa', label: 'Nombre empresa', section: 'cliente' },
  { key: 'tipoIdentificacionTarjetahabiente', label: 'Tipo doc. tarjetahabiente', section: 'cliente' },
  { key: 'numeroIdentificacionTarjetahabiente', label: 'Número doc. tarjetahabiente', section: 'cliente' },
  { key: 'nombreTarjetahabiente', label: 'Nombre tarjetahabiente', section: 'cliente' },
  { key: 'unidadNegocios', label: 'Unidad de negocios', section: 'cliente' },
  { key: 'tipoTarjetaNueva', label: 'Tipo tarjeta', section: 'tarjeta' },
  { key: 'binProducto', label: 'BIN producto', section: 'tarjeta' },
  { key: 'cargoDebitoAutomatico', label: 'Cargo débito automático', section: 'tarjeta' },
  { key: 'cupoTarjetaNueva', label: 'Cupo tarjeta nueva', section: 'tarjeta', format: 'currency' },
  { key: 'cupoDisponibleCec', label: 'Cupo disponible CEC', section: 'tarjeta', format: 'currency' },
  { key: 'codigoOficinaCentroServicio', label: 'Código oficina / centro', section: 'entrega' },
  { key: 'ciudadPuntoEntrega', label: 'Ciudad punto entrega', section: 'entrega' },
  { key: 'direccionPuntoComercial', label: 'Dirección punto comercial', section: 'entrega' },
  { key: 'puntoEntrega', label: 'Punto de entrega', section: 'entrega', format: 'puntoEntrega' },
];

const PUNTO_ENTREGA_LABELS: Record<string, string> = {
  PUNTO_ENTREGA_A_COMERCIAL: 'Punto entrega a comercial',
  ENVIO_CERTIFICADO_COURIER: 'Envío certificado courier',
};

export function formatPowerAppFieldValue(
  entry: PowerAppFieldEntry,
  value: unknown,
): string {
  if (value == null || value === '') {
    return '—';
  }
  if (entry.format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (entry.format === 'puntoEntrega' && typeof value === 'string') {
    return PUNTO_ENTREGA_LABELS[value] ?? value;
  }
  return String(value);
}

export function powerAppSectionTitle(section: PowerAppFieldEntry['section']): string {
  const titles: Record<PowerAppFieldEntry['section'], string> = {
    cliente: 'Cliente',
    tarjeta: 'Tarjeta',
    entrega: 'Entrega',
    documentos: 'Documentos',
  };
  return titles[section];
}
