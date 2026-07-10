export interface ClienteFinal {
  clienteId: string;
  nombre: string | null;
  ciudad: string | null;
  subsegmento: string | null;
  cupoDisponible: number | null;
  leaAprobado: number | null;
}

export interface ClientesFinalesResponse {
  total: number;
  clientes: ClienteFinal[];
}
