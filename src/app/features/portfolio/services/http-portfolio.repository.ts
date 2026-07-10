import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { FILE_MATCHING_API, PIPELINE_API } from '../../../core/config/api.config';
import { CallDetail, SalesCallsService } from '../../../core/services/sales-calls.service';
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
import {
  clientInterested,
  identityVerified,
  isManualCall,
} from '../../../shared/utils/call-display.util';
import { matchesNit } from '../../../shared/utils/nit.util';
import { matchesPortfolioSection, matchesStageFilter } from '../utils/portfolio-section.util';

// Todo lead recién cruzado entra al pipeline en la etapa de llamadas de venta.
const INITIAL_STAGE: PipelineStageId = 'calls';
const CLIENT_FILTER_FETCH_LIMIT = 500;

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
    const hasClientFilters = !!query.section || !!query.stage;
    let params = new HttpParams();

    if (hasClientFilters) {
      params = params.set('page', '1').set('limit', String(CLIENT_FILTER_FETCH_LIMIT));
    } else {
      params = params.set('page', String(query.page)).set('limit', String(query.pageSize));
    }

    const search = query.search?.trim();
    if (search) {
      params = params.set('q', search);
    }

    return forkJoin({
      response: this.http.get<ClientesFinalesPaginatedResponse>(this.endpoint, { params }),
      calls: this.listCallsSafe(),
    }).pipe(
      map(({ response, calls }) => {
        const summaries = response.clientes.map((cliente) => {
          const pipelineCase = cliente.pipelineCase ?? undefined;
          const callState = this.callStateFor(cliente.clienteId, calls);
          const pipeline = this.toPipeline(cliente, pipelineCase);
          applyCallState(pipeline, callState);
          this.cache.set(pipeline.id, pipeline);
          return this.toSummary(pipeline, !!callState);
        });

        if (!hasClientFilters) {
          return {
            companies: summaries,
            total: response.total,
            page: response.page ?? query.page,
            pageSize: response.pageSize ?? query.pageSize,
          };
        }

        const filtered = summaries.filter(
          (company) =>
            (!query.section || matchesPortfolioSection(company, query.section)) &&
            matchesStageFilter(company, query.stage),
        );
        const start = (query.page - 1) * query.pageSize;

        return {
          companies: filtered.slice(start, start + query.pageSize),
          total: filtered.length,
          page: query.page,
          pageSize: query.pageSize,
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
      switchMap(({ detail, calls }) => {
        const pipelineCase$ = detail.pipelineCase
          ? of(detail.pipelineCase)
          : this.ensurePipelineCase(companyId);

        return pipelineCase$.pipe(
          map((pipelineCase) => {
            const pipeline = this.toPipeline(detail.cliente, pipelineCase ?? undefined);
            applyCallState(pipeline, this.callStateFor(detail.cliente.clienteId, calls));
            this.cache.set(pipeline.id, pipeline);
            return structuredClone(pipeline);
          }),
        );
      }),
    );
  }

  getCallsForCompany(nit: string): Observable<CallDetail[]> {
    return this.listCallsSafe().pipe(
      map((calls) =>
        calls
          .filter((c) => matchesNit(c.variables?.['nit'], nit))
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      ),
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

  private ensurePipelineCase(leadId: string): Observable<PipelineCaseDto | null> {
    const params = new HttpParams().set('ensure', 'true');
    return this.http
      .get<PipelineCaseResponse>(
        `${PIPELINE_API}/cases/by-lead/${encodeURIComponent(leadId)}`,
        { params },
      )
      .pipe(
        map((response) => response.case),
        catchError(() => of(null)),
      );
  }

  /** Lista de llamadas tolerante a fallos: si el endpoint falla, no rompe el portafolio. */
  private listCallsSafe(): Observable<CallDetail[]> {
    return this.salesCalls.listCalls().pipe(catchError(() => of([] as CallDetail[])));
  }

  /** Deriva el estado del stage `calls` desde la llamada más reciente del cliente (match por NIT). */
  private callStateFor(clienteId: string, calls: CallDetail[]): CallStateInput | undefined {
    const matches = calls.filter((c) => matchesNit(c.variables?.['nit'], clienteId));
    if (matches.length === 0) {
      return undefined;
    }
    const latest = matches.reduce((a, b) =>
      (a.updatedAt ?? '') >= (b.updatedAt ?? '') ? a : b,
    );
    return {
      status: latest.status,
      hasRecording: !!latest.recordingUrl || (!isManualCall(latest) && latest.status === 'completed'),
      qualified: this.isQualified(latest),
      identityVerified: identityVerified(latest),
      clientInterested: clientInterested(latest),
      isManual: isManualCall(latest),
      at: latest.updatedAt,
      callId: latest.id,
    };
  }

  private isQualified(call: CallDetail): boolean {
    if (call.successEvaluation === true || call.successEvaluation === 'true' || call.successEvaluation === 'Verdadero') {
      return true;
    }
    return identityVerified(call) === true && clientInterested(call) === true;
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
    const deliveryFinalized =
      pipelineCase?.stage === 'activation_follow_up' || pipelineCase?.stage === 'completed';

    const stages = buildStages(currentStageId);
    if (deliveryFinalized) {
      // Backend ya avanzó a activation_follow_up: el check "Cierre de entrega" está hecho.
      const followUp = stages.find((stage) => stage.id === 'follow_up');
      if (followUp) {
        followUp.status = 'completed';
        followUp.subSteps = followUp.subSteps.map((step) => ({
          ...step,
          status: 'completed' as const,
          completedAt: pipelineCase?.updatedAt ?? new Date().toISOString(),
        }));
      }
    }

    return {
      id: cliente.clienteId,
      // El Cliente_Id de una empresa es su NIT (ver contexto de negocio).
      name: cliente.nombre?.trim() || 'Empresa sin nombre',
      nit: cliente.clienteId,
      clienteId: cliente.clienteId,
      currentStageId,
      currentStageLabel: PIPELINE_STAGE_LABELS[currentStageId],
      progressPercent: deliveryFinalized ? 100 : computeProgress(currentStageId),
      assignedCommercial: 'Por asignar',
      activationStatus: 'pending',
      phone: cliente.telefono,
      email: cliente.correo,
      representanteLegalNombre: cliente.representanteLegalNombre,
      pipelineCaseId: pipelineCase?.id,
      pipelineCaseStage: pipelineCase?.stage,
      powerAppSubmittedAt: powerAppSubmitted ? pipelineCase!.updatedAt : undefined,
      stages,
    };
  }

  private toSummary(pipeline: CompanyPipeline, hasCall = false) {
    const { stages, ...summary } = pipeline;
    void stages;
    return { ...summary, hasCall };
  }
}
