import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  ActionResult,
  CompanyPipeline,
  PortfolioCompanySummary,
  PortfolioKpis,
} from '../models/portfolio-company.model';
import { PIPELINE_STAGE_LABELS, PipelineStageId } from '../models/pipeline-stage.model';
import { PortfolioRepository } from '../models/portfolio.repository';
import {
  applyPipelineAction,
  buildStages,
  computeProgress,
  summaryFromPipeline,
} from '../utils/pipeline-builder';

const INITIAL_PIPELINES: CompanyPipeline[] = [
  {
    id: 'emp-001',
    name: 'Servicios Andinos S.A.S.',
    nit: '900123456-1',
    currentStageId: 'calls',
    currentStageLabel: PIPELINE_STAGE_LABELS.calls,
    progressPercent: computeProgress('calls'),
    assignedCommercial: 'Laura Méndez',
    activationStatus: 'pending',
    stages: buildStages('calls'),
  },
  {
    id: 'emp-002',
    name: 'Comercial del Pacífico Ltda.',
    nit: '800987654-3',
    currentStageId: 'power_app',
    currentStageLabel: PIPELINE_STAGE_LABELS.power_app,
    progressPercent: computeProgress('power_app'),
    assignedCommercial: 'Carlos Ríos',
    activationStatus: 'pending',
    stages: buildStages('power_app'),
  },
  {
    id: 'emp-003',
    name: 'Grupo Industrial Norte',
    nit: '901555222-0',
    currentStageId: 'card_delivery',
    currentStageLabel: PIPELINE_STAGE_LABELS.card_delivery,
    progressPercent: computeProgress('card_delivery'),
    cardShippedAt: '2026-06-20T08:00:00.000Z',
    assignedCommercial: 'Ana Torres',
    activationStatus: 'pending',
    stages: buildStages('card_delivery', {
      card_delivery: {
        subSteps: [
          { id: 'manufacturing', title: 'Tarjeta fabricada', description: 'Fabricación del plástico completada.', status: 'completed', completedAt: '2026-06-18T08:00:00.000Z', assignee: 'GOPTC' },
          { id: 'delivery', title: 'Entrega', description: 'Tarjeta en tránsito con courier certificado.', status: 'completed', completedAt: '2026-06-20T08:00:00.000Z', assignee: 'Courier' },
          { id: 'receipt', title: 'Acuse de recibido firmado', description: 'Pendiente firma del acuse de recibido.', status: 'in_progress', assignee: 'Destinatario' },
        ],
      },
    }),
  },
  {
    id: 'emp-004',
    name: 'Logística Express Colombia',
    nit: '890321654-7',
    currentStageId: 'follow_up',
    currentStageLabel: PIPELINE_STAGE_LABELS.follow_up,
    progressPercent: computeProgress('follow_up'),
    cardShippedAt: '2026-05-15T08:00:00.000Z',
    assignedCommercial: 'Mauricio Cardona',
    activationStatus: 'at_risk',
    stages: buildStages('follow_up'),
  },
  {
    id: 'emp-005',
    name: 'Tecnología Empresarial S.A.',
    nit: '901888444-2',
    currentStageId: 'follow_up',
    currentStageLabel: PIPELINE_STAGE_LABELS.follow_up,
    progressPercent: computeProgress('follow_up'),
    cardShippedAt: '2026-04-10T08:00:00.000Z',
    assignedCommercial: 'Diana Vargas',
    activationStatus: 'at_risk',
    stages: buildStages('follow_up'),
  },
];

@Injectable()
export class MockPortfolioRepository implements PortfolioRepository {
  private pipelines = structuredClone(INITIAL_PIPELINES);

  getCompanies(): Observable<PortfolioCompanySummary[]> {
    return of(this.pipelines.map(summaryFromPipeline)).pipe(delay(300));
  }

  getKpis(): Observable<PortfolioKpis> {
    const companies = this.pipelines.map(summaryFromPipeline);
    return of({
      sold: companies.length,
      inFollowUp: companies.filter((c) => c.currentStageId === 'follow_up' && c.activationStatus !== 'activated').length,
      activated: companies.filter((c) => c.activationStatus === 'activated').length,
      atRisk: companies.filter((c) => c.activationStatus === 'at_risk').length,
    }).pipe(delay(200));
  }

  getCompanyPipeline(companyId: string): Observable<CompanyPipeline> {
    const pipeline = this.pipelines.find((p) => p.id === companyId);
    if (!pipeline) {
      return throwError(() => new Error('Empresa no encontrada'));
    }
    return of(structuredClone(pipeline)).pipe(delay(300));
  }

  executeAction(companyId: string, stageId: string, actionId: string): Observable<ActionResult> {
    const index = this.pipelines.findIndex((p) => p.id === companyId);
    if (index < 0) {
      return throwError(() => new Error('Empresa no encontrada'));
    }

    const pipeline = this.pipelines[index];
    const message = applyPipelineAction(pipeline, stageId as PipelineStageId, actionId);

    this.pipelines[index] = structuredClone(pipeline);
    return of({ success: true, message, pipeline: structuredClone(pipeline) }).pipe(delay(500));
  }
}
