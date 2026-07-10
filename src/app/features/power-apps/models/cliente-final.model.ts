import { PipelineCaseDto } from '../../portfolio/models/pipeline-case.model';

export interface ClienteFinal {
  clienteId: string;
  nombre: string | null;
  ciudad: string | null;
  subsegmento: string | null;
  cupoDisponible: number | null;
  leaAprobado: number | null;
  correo?: string | null;
  telefono?: string | null;
  representanteLegalNombre?: string | null;
  representanteLegalDocumento?: string | null;
  representanteLegalCargo?: string | null;
  direccionComercial?: string | null;
  municipioComercial?: string | null;
  tipoSociedad?: string | null;
  actividadEconomica?: string | null;
  ruesFound?: boolean | null;
  ruesEnrichedAt?: string | null;
  pipelineCase?: PipelineCaseDto | null;
}

export interface ClienteFinalByIdResponse {
  cliente: ClienteFinal;
  pipelineCase?: PipelineCaseDto;
}

export interface ClientesFinalesResponse {
  total: number;
  clientes: ClienteFinal[];
}
