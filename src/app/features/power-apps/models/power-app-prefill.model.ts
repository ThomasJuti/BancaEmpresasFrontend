import {
  PowerAppFormValue,
  PuntoEntrega,
  TipoIdentificacionTarjetahabiente,
} from './power-app-submit.model';

export interface PowerAppHandoffPrefill {
  leadId?: string;
  campana?: string;
  asesorId?: string;
  segmento?: string;
  tipoIdentificacionEmpresa?: 'NIT';
  tipoIdentificacionTarjetahabiente?: TipoIdentificacionTarjetahabiente;
  numeroIdentificacionTarjetahabiente?: string;
  unidadNegocios?: string;
  tipoTarjetaNueva?: string;
  identificacionEmpresa?: string;
  nombreEmpresa?: string;
  nombreTarjetahabiente?: string;
  binProducto?: string;
  cargoDebitoAutomatico?: string;
  cupoTarjetaNueva?: number;
  cupoDisponibleCec?: number;
  codigoOficinaCentroServicio?: string;
  ciudadPuntoEntrega?: string;
  direccionPuntoComercial?: string;
  puntoEntrega?: PuntoEntrega;
}
