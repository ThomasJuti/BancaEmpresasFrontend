import { ValidationIssue } from './power-app-submit.model';

export interface RuesRepresentante {
  documento: string;
  nombre: string;
}

export interface RuesConsultation {
  solicitudId: string;
  nit: string;
  consultadoEn: string;
  urlConsulta: string;
  razonSocial: string;
  datos: Record<string, string>;
  secciones: Record<string, Record<string, string>>;
  representantes: RuesRepresentante[];
  actividades: string[];
}

export interface RuesConsultarResponse {
  consultation: RuesConsultation;
  pdfFilename: string;
  pdfBase64: string | null;
  issues: ValidationIssue[];
  mock?: boolean;
}

export interface RuesFormSnapshot {
  identificacionEmpresa?: string;
  nombreEmpresa?: string;
  numeroIdentificacionTarjetahabiente?: string;
  nombreTarjetahabiente?: string;
  ciudadPuntoEntrega?: string;
}

export interface RuesMetadata {
  solicitudId: string;
  consultadoEn: string;
  documentoOrigen: 'RUES' | 'MANUAL';
  consultation: RuesConsultation | null;
}
