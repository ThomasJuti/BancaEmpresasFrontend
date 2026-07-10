// DTO de la respuesta del backend (feature file-matching): cliente elegible
// resultante del cruce Base Potencial × CEC × SG. Es el universo de leads que
// entra al pipeline de colocación en la etapa de llamadas de venta.
export interface ClienteFinalDto {
  clienteId: string;
  nombre: string | null;
  ciudad: string | null;
  subsegmento: string | null;
  cupoDisponible: number | null;
  leaAprobado: number | null;
}

export interface ClientesFinalesResponse {
  total: number;
  clientes: ClienteFinalDto[];
}

export interface ClientesFinalesPaginatedResponse extends ClientesFinalesResponse {
  page: number;
  pageSize: number;
}

export interface ClienteFinalByIdResponse {
  cliente: ClienteFinalDto;
}
