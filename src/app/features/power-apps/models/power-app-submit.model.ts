export type TipoIdentificacionTarjetahabiente = 'CC' | 'CE' | 'PA' | 'TI';
export type PuntoEntrega = 'PUNTO_ENTREGA_A_COMERCIAL' | 'ENVIO_CERTIFICADO_COURIER';
export type PowerAppDecision = 'APROBADO' | 'RECHAZADO' | 'DEVUELTO';

export interface PowerAppSubmitRequest {
  leadId?: string;
  campana?: string;
  asesorId?: string;
  segmento: string;
  tipoIdentificacionEmpresa: 'NIT';
  tipoIdentificacionTarjetahabiente: TipoIdentificacionTarjetahabiente;
  numeroIdentificacionTarjetahabiente: string;
  unidadNegocios: string;
  tipoTarjetaNueva: string;
  identificacionEmpresa: string;
  nombreEmpresa: string;
  nombreTarjetahabiente: string;
  binProducto: string;
  cargoDebitoAutomatico: string;
  cupoTarjetaNueva: number;
  cupoDisponibleCec?: number;
  archivosAdjuntos: string[];
  codigoOficinaCentroServicio: string;
  ciudadPuntoEntrega: string;
  direccionPuntoComercial: string;
  puntoEntrega: PuntoEntrega;
  ruesSolicitudId?: string;
  ruesConsultadoEn?: string;
  documentoOrigen?: 'RUES' | 'MANUAL';
  ruesConsultation?: RuesConsultationRef;
}

export interface RuesConsultationRef {
  solicitudId: string;
  nit: string;
  consultadoEn: string;
  urlConsulta: string;
  razonSocial: string;
  datos: Record<string, string>;
  secciones?: Record<string, Record<string, string>>;
  representantes?: Array<{ documento: string; nombre: string }>;
  actividades?: string[];
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface PowerAppSubmitResponse {
  caseId?: string;
  decision: PowerAppDecision;
  valid: boolean;
  radicado: string | null;
  issues: ValidationIssue[];
  summary: string;
  siguientePaso: string | null;
  submittedAt?: string;
}

export type PowerAppFormValue = PowerAppSubmitRequest;

export const PREFILL_FIELD_KEYS = [
  'identificacionEmpresa',
  'nombreEmpresa',
  'segmento',
  'cupoDisponibleCec',
  'ciudadPuntoEntrega',
  'leadId',
] as const;
