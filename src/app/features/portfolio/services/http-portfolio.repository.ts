import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { FILE_MATCHING_API, PIPELINE_API } from '../../../core/config/api.config';
import { CallRecord, SalesCallsService } from '../../../core/services/sales-calls.service';
import { PipelineCaseDto, PipelineCaseResponse } from '../models/pipeline-case.model';
import { isPowerAppStageCompleted, mapBackendStageToFrontend } from '../utils/pipeline-case.mapper';
import {
  ClienteFinalByIdResponse,
  ClienteFinalDto,
  ClientesFinalesPaginatedResponse,
} from '../models/cliente-final.model';
import { PIPELINE_STAGE_LABELS, PipelineStageId } from '../models/pipeline-stage.model';
import {
  ActionResult,
  CompanyPipeline,
  PortfolioKpis,
} from '../models/portfolio-company.model';
import {
  PortfolioPageQuery,
  PortfolioPageResult,
  PortfolioRepository,
} from '../models/portfolio.repository';
import {
  applyCallState,
  applyPipelineAction,
  buildStages,
  CallStateInput,
  computeProgress,
} from '../utils/pipeline-builder';

// Todo lead recién cruzado entra al pipeline en la etapa de llamadas de venta.
const INITIAL_STAGE: PipelineStageId = 'calls';

/**
 * Implementación de PortfolioRepository contra el backend real.
 * Consume `GET /api/file-matching/clientes-finales` (clientes elegibles desde
 * Supabase) y los proyecta al modelo de portafolio del front. El detalle del
 * pipeline y las acciones se construyen en cliente; el avance de Power App se
 * consulta en `pipeline_cases` cuando el backend lo expone.
 */
@Injectable()
export class HttpPortfolioRepository implements PortfolioRepository {
  private readonly http = inject(HttpClient);
  private readonly salesCalls = inject(SalesCallsService);
  private readonly endpoint = `${FILE_MATCHING_API}/clientes-finales`;

  // Pipelines construidos en la sesión, para conservar el efecto de las acciones
  // entre navegaciones sin volver a pedir la lista al backend.
  private readonly cache = new Map<string, CompanyPipeline>();

  getCompanies(query: PortfolioPageQuery): Observable<PortfolioPageResult> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('limit', String(query.pageSize));

    const search = query.search?.trim();
    if (search) {
      params = params.set('q', search);
    }

    return forkJoin({
      response: this.http.get<ClientesFinalesPaginatedResponse>(this.endpoint, { params }),
      calls: this.listCallsSafe(),
    }).pipe(
      map(({ response, calls }) => {
        const isPaginated = response.page !== undefined && response.pageSize !== undefined;
        const clientes = isPaginated
          ? response.clientes
          : response.clientes.slice(
              (query.page - 1) * query.pageSize,
              query.page * query.pageSize,
            );

        const companies = clientes.map((cliente) => {
          const pipelineCase = cliente.pipelineCase ?? undefined;
          const pipeline = this.toPipeline(cliente, pipelineCase);
          applyCallState(pipeline, this.callStateFor(cliente.clienteId, calls));
          this.cache.set(pipeline.id, pipeline);
          return this.toSummary(pipeline);
        });

        return {
          companies,
          total: response.total,
          page: response.page ?? query.page,
          pageSize: response.pageSize ?? query.pageSize,
        };
      }),
    );
  }

  getKpis(): Observable<PortfolioKpis> {
    const params = new HttpParams().set('page', '1').set('limit', '1');
    return this.http.get<ClientesFinalesPaginatedResponse>(this.endpoint, { params }).pipe(
      map((response) => ({
        sold: response.total,
        inFollowUp: 0,
        activated: 0,
        atRisk: 0,
      })),
    );
  }

  getCompanyPipeline(companyId: string): Observable<CompanyPipeline> {
    return forkJoin({
      detail: this.fetchClienteDetail(companyId),
      calls: this.listCallsSafe(),
    }).pipe(
      map(({ detail, calls }) => {
        const pipeline = this.toPipeline(detail.cliente, detail.pipelineCase);
        applyCallState(pipeline, this.callStateFor(detail.cliente.clienteId, calls));
        this.cache.set(pipeline.id, pipeline);
        return structuredClone(pipeline);
      }),
    );
  }

  invalidateCompanyCache(companyId: string): void {
    this.cache.delete(companyId);
  }

  private fetchClienteDetail(companyId: string): Observable<ClienteFinalByIdResponse> {
    return this.http
      .get<ClienteFinalByIdResponse>(`${this.endpoint}/${encodeURIComponent(companyId)}`)
      .pipe(catchError(() => this.fetchClienteDetailFallback(companyId)));
  }

  private fetchClienteDetailFallback(companyId: string): Observable<ClienteFinalByIdResponse> {
    return forkJoin({
      cliente: this.http.get<ClientesFinalesPaginatedResponse>(this.endpoint).pipe(
        map((response) => {
          const cliente = response.clientes.find((c) => c.clienteId === companyId);
          if (!cliente) {
            throw new Error('Empresa no encontrada');
          }
          return cliente;
        }),
      ),
      pipelineCase: this.http
        .get<PipelineCaseResponse>(`${PIPELINE_API}/cases/by-lead/${encodeURIComponent(companyId)}`)
        .pipe(
          map((response) => response.case),
          catchError(() => of<PipelineCaseDto | null>(null)),
        ),
    }).pipe(
      map(({ cliente, pipelineCase }) => ({
        cliente,
        ...(pipelineCase ? { pipelineCase } : {}),
      })),
    );
  }

  /** Lista de llamadas tolerante a fallos: si el endpoint falla, no rompe el portafolio. */
  private listCallsSafe(): Observable<CallRecord[]> {
    return this.salesCalls.listCalls().pipe(catchError(() => of([] as CallRecord[])));
  }

  /** Deriva el estado del stage `calls` desde la llamada más reciente del cliente (match por NIT). */
  private callStateFor(clienteId: string, calls: CallRecord[]): CallStateInput | undefined {
    const matches = calls.filter((c) => c.variables?.['nit'] === clienteId);
    if (matches.length === 0) {
      return undefined;
    }
    const latest = matches.reduce((a, b) =>
      (a.updatedAt ?? '') >= (b.updatedAt ?? '') ? a : b,
    );
    return {
      status: latest.status,
      hasRecording: !!latest.recordingUrl,
      qualified: this.isQualified(latest.successEvaluation),
      at: latest.updatedAt,
    };
  }

  private isQualified(value?: boolean | string): boolean {
    return value === true || value === 'true' || value === 'Verdadero';
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

  private toPipeline(cliente: ClienteFinalDto, pipelineCase?: PipelineCaseDto): CompanyPipeline {
    const currentStageId = pipelineCase
      ? mapBackendStageToFrontend(pipelineCase.stage)
      : INITIAL_STAGE;
    const powerAppSubmitted = pipelineCase ? isPowerAppStageCompleted(pipelineCase.stage) : false;

    return {
      id: cliente.clienteId,
      // El Cliente_Id de una empresa es su NIT (ver contexto de negocio).
      name: cliente.nombre?.trim() || 'Empresa sin nombre',
      nit: cliente.clienteId,
      clienteId: cliente.clienteId,
      currentStageId,
      currentStageLabel: PIPELINE_STAGE_LABELS[currentStageId],
      progressPercent: computeProgress(currentStageId),
      assignedCommercial: 'Por asignar',
      activationStatus: 'pending',
      phone: cliente.telefono,
      email: cliente.correo,
      powerAppSubmittedAt: powerAppSubmitted ? pipelineCase!.updatedAt : undefined,
      stages: buildStages(currentStageId),
    };
  }

  private toSummary(pipeline: CompanyPipeline) {
    const { stages, ...summary } = pipeline;
    void stages;
    return summary;
  }
}
