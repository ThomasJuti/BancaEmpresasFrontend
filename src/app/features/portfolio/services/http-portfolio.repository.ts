import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import { FILE_MATCHING_API } from '../../../core/config/api.config';
import { ClienteFinalDto, ClientesFinalesResponse } from '../models/cliente-final.model';
import { PIPELINE_STAGE_LABELS, PipelineStageId } from '../models/pipeline-stage.model';
import {
  ActionResult,
  CompanyPipeline,
  PortfolioCompanySummary,
  PortfolioKpis,
} from '../models/portfolio-company.model';
import { PortfolioRepository } from '../models/portfolio.repository';
import { applyPipelineAction, buildStages, computeProgress } from '../utils/pipeline-builder';

// Todo lead recién cruzado entra al pipeline en la etapa de llamadas de venta.
const INITIAL_STAGE: PipelineStageId = 'calls';

/**
 * Implementación de PortfolioRepository contra el backend real.
 * Consume `GET /api/file-matching/clientes-finales` (clientes elegibles desde
 * Supabase) y los proyecta al modelo de portafolio del front. El detalle del
 * pipeline y las acciones se construyen en cliente (aún no hay endpoints de
 * avance por empresa); el estado de sesión vive en memoria (minimización de
 * datos: no se persiste PII en el navegador).
 */
@Injectable()
export class HttpPortfolioRepository implements PortfolioRepository {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${FILE_MATCHING_API}/clientes-finales`;

  // Pipelines construidos en la sesión, para conservar el efecto de las acciones
  // entre navegaciones sin volver a pedir la lista al backend.
  private readonly cache = new Map<string, CompanyPipeline>();

  getCompanies(): Observable<PortfolioCompanySummary[]> {
    return this.http.get<ClientesFinalesResponse>(this.endpoint).pipe(
      map((response) => {
        this.cache.clear();
        return response.clientes.map((cliente) => {
          const pipeline = this.toPipeline(cliente);
          this.cache.set(pipeline.id, pipeline);
          return this.toSummary(pipeline);
        });
      }),
    );
  }

  getKpis(): Observable<PortfolioKpis> {
    return this.http.get<ClientesFinalesResponse>(this.endpoint).pipe(
      map((response) => ({
        sold: response.total,
        inFollowUp: 0,
        activated: 0,
        atRisk: 0,
      })),
    );
  }

  getCompanyPipeline(companyId: string): Observable<CompanyPipeline> {
    const cached = this.cache.get(companyId);
    if (cached) {
      return of(structuredClone(cached));
    }
    return this.http.get<ClientesFinalesResponse>(this.endpoint).pipe(
      map((response) => {
        const cliente = response.clientes.find((c) => c.clienteId === companyId);
        if (!cliente) {
          throw new Error('Empresa no encontrada');
        }
        const pipeline = this.toPipeline(cliente);
        this.cache.set(pipeline.id, pipeline);
        return structuredClone(pipeline);
      }),
    );
  }

  executeAction(companyId: string, stageId: string, actionId: string): Observable<ActionResult> {
    const pipeline = this.cache.get(companyId);
    if (!pipeline) {
      return throwError(() => new Error('Empresa no encontrada'));
    }
    const message = applyPipelineAction(pipeline, stageId as PipelineStageId, actionId);
    this.cache.set(companyId, pipeline);
    return of({ success: true, message, pipeline: structuredClone(pipeline) });
  }

  private toPipeline(cliente: ClienteFinalDto): CompanyPipeline {
    return {
      id: cliente.clienteId,
      // El Cliente_Id de una empresa es su NIT (ver contexto de negocio).
      name: cliente.nombre?.trim() || 'Empresa sin nombre',
      nit: cliente.clienteId,
      clienteId: cliente.clienteId,
      currentStageId: INITIAL_STAGE,
      currentStageLabel: PIPELINE_STAGE_LABELS[INITIAL_STAGE],
      progressPercent: computeProgress(INITIAL_STAGE),
      assignedCommercial: 'Por asignar',
      activationStatus: 'pending',
      stages: buildStages(INITIAL_STAGE),
    };
  }

  private toSummary(pipeline: CompanyPipeline): PortfolioCompanySummary {
    const { stages, ...summary } = pipeline;
    void stages;
    return summary;
  }
}
