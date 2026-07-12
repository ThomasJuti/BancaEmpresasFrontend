import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FollowUpService } from '../../../../core/services/follow-up.service';
import { PowerAppFormModalComponent } from '../../../power-apps/components/power-app-form-modal/power-app-form-modal.component';
import { PowerAppSubmitResponse, StoredPowerAppSubmission } from '../../../power-apps/models/power-app-submit.model';
import { PowerAppService } from '../../../power-apps/services/power-app.service';
import { PowerAppSubmissionStore } from '../../../power-apps/services/power-app-submission.store';
import { PipelineAction, PipelineStageId } from '../../models/pipeline-stage.model';
import { CompanyPipeline } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import { computeProgress } from '../../utils/pipeline-builder';
import { canOpenPowerApp, isStageReachable } from '../../utils/pipeline-access.util';
import { PipelineStepperComponent } from '../pipeline-stepper/pipeline-stepper.component';
import { StageDetailPanelComponent } from '../stage-detail-panel/stage-detail-panel.component';
import { CallsChangedEvent } from '../company-calls-panel/company-calls-panel.component';

@Component({
  selector: 'app-company-pipeline-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PipelineStepperComponent,
    StageDetailPanelComponent,
    PowerAppFormModalComponent,
  ],
  templateUrl: './company-pipeline-page.component.html',
  styleUrls: ['./company-pipeline-page.component.css'],
})
export class CompanyPipelinePageComponent implements OnInit {
  private readonly repository = inject<PortfolioRepository>(PORTFOLIO_REPOSITORY);
  private readonly submissionStore = inject(PowerAppSubmissionStore);
  private readonly powerAppService = inject(PowerAppService);
  private readonly followUpService = inject(FollowUpService);
  private readonly route = inject(ActivatedRoute);

  readonly pipeline = signal<CompanyPipeline | null>(null);
  readonly selectedStageId = signal<PipelineStageId>('calls');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly feedback = signal<string | null>(null);

  readonly pendingAction = signal<PipelineAction | null>(null);
  readonly showConfirmModal = signal(false);
  readonly showPowerAppModal = signal(false);
  readonly powerAppReadOnly = signal(false);
  readonly lastRadicado = signal<string | null>(null);
  readonly callsFocusAction = signal<'auto' | 'manual' | null>(null);
  readonly callsSelectedId = signal<string | null>(null);
  readonly expandedSubStepId = signal<string | null>(null);
  readonly callsRefreshKey = signal(0);
  readonly callsCount = signal(0);
  readonly powerAppSubmission = signal<StoredPowerAppSubmission | null>(null);

  readonly linkedCallId = computed(() => {
    const p = this.pipeline();
    if (!p) return null;
    return p.stages.find((s) => s.id === 'calls')?.linkedCallId ?? null;
  });

  readonly selectedStage = computed(() => {
    const p = this.pipeline();
    if (!p) return null;
    return p.stages.find((s) => s.id === this.selectedStageId()) ?? null;
  });

  readonly backUrl = '/portafolio/pipeline';
  readonly backLabel = '← Volver a en gestión';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((query) => {
      const etapa = query.get('etapa') as PipelineStageId | null;
      const accion = query.get('accion');
      if (etapa && ['calls', 'power_app', 'operations', 'card_delivery', 'follow_up'].includes(etapa)) {
        this.selectedStageId.set(etapa);
      }
      if (accion === 'auto' || accion === 'manual') {
        this.callsFocusAction.set(accion);
        this.expandedSubStepId.set('contact');
      } else if (query.get('historial') === '1') {
        this.expandedSubStepId.set('recording');
      }
    });

    this.route.paramMap.subscribe((params) => {
      const companyId = params.get('companyId');
      if (companyId) {
        this.load(companyId);
      }
    });
  }

  load(companyId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.getCompanyPipeline(companyId).subscribe({
      next: (pipeline) => {
        const restored = this.applyStoredSubmission(pipeline);
        this.pipeline.set(restored);
        if (!this.route.snapshot.queryParamMap.get('etapa')) {
          this.selectedStageId.set(restored.currentStageId);
        }
        this.loading.set(false);
        this.preloadCallsHistory(restored);
        this.loadPowerAppSubmission(restored);
      },
      error: () => {
        this.error.set('No se encontró la empresa solicitada.');
        this.loading.set(false);
      },
    });
  }

  selectStage(stageId: PipelineStageId): void {
    const p = this.pipeline();
    if (!p || !isStageReachable(stageId, p)) {
      this.showFeedback('Esta etapa aún no está disponible. Complete las etapas anteriores.');
      return;
    }
    this.selectedStageId.set(stageId);
    this.expandedSubStepId.set(null);
    this.callsFocusAction.set(null);
    if (stageId === 'power_app' && p) {
      this.loadPowerAppSubmission(p);
    }
  }

  onExpandedSubStepChange(subStepId: string | null): void {
    this.expandedSubStepId.set(subStepId);
    if (subStepId !== 'contact') {
      this.callsFocusAction.set(null);
    }
  }

  onActionRequested(action: PipelineAction): void {
    if (action.id === 'fill_power_app' || action.id === 'view_power_app_result') {
      const p = this.pipeline();
      if (!p) return;

      if (action.id === 'fill_power_app' && !canOpenPowerApp(p)) {
        this.showFeedback('Complete el contacto telefónico calificado para habilitar la solicitud Power App.');
        return;
      }

      const stored = this.submissionStore.getRecord(p.id);
      if (stored?.response.valid || p.powerAppSubmittedAt) {
        this.powerAppReadOnly.set(true);
      } else {
        this.powerAppReadOnly.set(false);
      }
      this.showPowerAppModal.set(true);
      return;
    }

    if (action.id === 'start_agent_call') {
      this.expandedSubStepId.set('contact');
      this.callsFocusAction.set('auto');
      return;
    }

    if (action.requiresConfirmation) {
      this.pendingAction.set(action);
      this.showConfirmModal.set(true);
      return;
    }

    this.runAction(action);
  }

  onPowerAppSubmitted(result: PowerAppSubmitResponse): void {
    const p = this.pipeline();
    if (!p) return;

    if (!result.valid) {
      this.powerAppReadOnly.set(false);
      this.showFeedback(
        result.decision === 'DEVUELTO'
          ? 'Solicitud devuelta. Corrija los campos indicados y vuelva a enviar.'
          : 'Solicitud rechazada. Corrija los errores y vuelva a intentar.',
      );
      return;
    }

    this.submissionStore.save(p.id, result);
    this.powerAppReadOnly.set(true);
    this.lastRadicado.set(result.radicado);
    this.powerAppSubmission.set(this.submissionStore.getRecord(p.id) ?? null);

    this.actionLoading.set(true);
    this.repository.invalidateCompanyCache(p.id);
    this.repository.getCompanyPipeline(p.id).subscribe({
      next: (refreshed) => {
        const updated = this.applyStoredSubmission(refreshed, result);
        this.pipeline.set(updated);
        this.selectedStageId.set(updated.currentStageId);
        this.showFeedback(
          result.radicado
            ? `Solicitud aprobada. Radicado ${result.radicado}.`
            : 'Solicitud aprobada.',
        );
        this.actionLoading.set(false);
      },
      error: () => {
        this.markPipelineSubmitted(p, result);
        this.repository.executeAction(p.id, 'power_app', 'power_app_approved').subscribe({
          next: (actionResult) => {
            if (actionResult.pipeline) {
              const updated = this.applyStoredSubmission(actionResult.pipeline, result);
              this.pipeline.set(updated);
              this.selectedStageId.set(updated.currentStageId);
            }
            this.showFeedback(
              result.radicado
                ? `Solicitud aprobada. Radicado ${result.radicado}.`
                : actionResult.message,
            );
            this.actionLoading.set(false);
          },
          error: () => {
            this.showFeedback(`Solicitud aprobada. Radicado ${result.radicado ?? '—'}.`);
            this.actionLoading.set(false);
          },
        });
      },
    });
  }

  closePowerAppModal(): void {
    this.showPowerAppModal.set(false);
    this.powerAppReadOnly.set(false);
  }

  confirmAction(): void {
    const action = this.pendingAction();
    if (action) {
      this.runAction(action);
    }
    this.closeConfirmModal();
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.pendingAction.set(null);
  }

  private runAction(action: PipelineAction): void {
    const p = this.pipeline();
    if (!p) return;

    if (action.id === 'finalize_delivery') {
      this.finalizeDelivery(p);
      return;
    }

    this.actionLoading.set(true);
    this.repository.executeAction(p.id, this.selectedStageId(), action.id).subscribe({
      next: (result) => {
        if (result.pipeline) {
          this.pipeline.set(result.pipeline);
          this.selectedStageId.set(result.pipeline.currentStageId);
        }
        this.showFeedback(result.message);
        this.actionLoading.set(false);
      },
      error: () => {
        this.showFeedback('No se pudo ejecutar la acción.');
        this.actionLoading.set(false);
      },
    });
  }

  private finalizeDelivery(pipeline: CompanyPipeline): void {
    this.actionLoading.set(true);
    this.followUpService
      .finalizeDelivery({
        clienteId: pipeline.clienteId ?? pipeline.nit,
        nombre: pipeline.name,
        telefono: pipeline.phone ?? undefined,
        correo: pipeline.email ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.repository.executeAction(pipeline.id, 'follow_up', 'finalize_delivery').subscribe({
            next: (actionResult) => {
              if (actionResult.pipeline) {
                this.pipeline.set(actionResult.pipeline);
              }
            },
          });

          if (result.yaExistia) {
            this.showFeedback('La entrega ya estaba finalizada; el seguimiento continúa en la vista Seguimiento.');
          } else if (result.llamadaFelicitacionIniciada) {
            this.showFeedback('Entrega finalizada. Llamada de felicitación iniciada; el cliente entró a Seguimiento.');
          } else {
            this.showFeedback('Entrega finalizada. El cliente entró a Seguimiento (la llamada de felicitación no se pudo iniciar).');
          }
          this.actionLoading.set(false);
        },
        error: () => {
          this.showFeedback('No se pudo finalizar la entrega. Intente de nuevo.');
          this.actionLoading.set(false);
        },
      });
  }

  private markPipelineSubmitted(pipeline: CompanyPipeline, result: PowerAppSubmitResponse): void {
    pipeline.powerAppSubmittedAt = result.submittedAt ?? new Date().toISOString();
    pipeline.powerAppRadicado = result.radicado;
    this.pipeline.set({ ...pipeline });
  }

  private applyStoredSubmission(
    pipeline: CompanyPipeline,
    latestResult?: PowerAppSubmitResponse,
  ): CompanyPipeline {
    const stored = this.submissionStore.get(pipeline.id);
    const approvedStored = stored?.valid ? stored : undefined;
    const submittedAt =
      pipeline.powerAppSubmittedAt ??
      latestResult?.submittedAt ??
      approvedStored?.submittedAt;

    const restored: CompanyPipeline = {
      ...pipeline,
      powerAppSubmittedAt: submittedAt,
      powerAppRadicado:
        pipeline.powerAppRadicado ??
        latestResult?.radicado ??
        approvedStored?.radicado ??
        null,
    };

    const backendCompleted =
      !!restored.powerAppSubmittedAt && restored.currentStageId !== 'power_app';

    if (
      !backendCompleted &&
      restored.powerAppSubmittedAt &&
      restored.currentStageId === 'power_app' &&
      approvedStored
    ) {
      const powerStage = restored.stages.find((stage) => stage.id === 'power_app');
      if (powerStage) {
        powerStage.status = 'completed';
        powerStage.subSteps.forEach((step) => {
          step.status = 'completed';
          step.completedAt = submittedAt;
        });
      }

      const operationsStage = restored.stages.find((stage) => stage.id === 'operations');
      if (operationsStage) {
        restored.currentStageId = 'operations';
        restored.currentStageLabel = operationsStage.title;
        restored.progressPercent = computeProgress('operations');
        operationsStage.status = 'in_progress';
      }
    }

    if (restored.powerAppSubmittedAt) {
      this.powerAppReadOnly.set(true);
    }

    return restored;
  }

  private showFeedback(message: string): void {
    this.feedback.set(message);
    setTimeout(() => this.feedback.set(null), 3500);
  }

  onCallsChanged(event?: CallsChangedEvent | void): void {
    const p = this.pipeline();
    if (!p) return;
    const payload = event && typeof event === 'object' ? event : undefined;

    this.callsRefreshKey.update((key) => key + 1);
    this.repository.invalidateCompanyCache(p.id);
    const nit = p.clienteId ?? p.nit;
    this.repository.getCallsForCompany(nit).subscribe({
      next: (calls) => this.callsCount.set(calls.length),
    });
    this.repository.getCompanyPipeline(p.id).subscribe({
      next: (refreshed) => {
        const updated = this.applyStoredSubmission(refreshed);
        this.pipeline.set(updated);
        const callsStage = updated.stages.find((s) => s.id === 'calls');
        const linkedId = callsStage?.linkedCallId ?? null;
        const recordingStep = callsStage?.subSteps.find((s) => s.id === 'recording');
        const recordingReady =
          recordingStep?.status === 'in_progress' || recordingStep?.status === 'completed';
        const contactStep = callsStage?.subSteps.find((s) => s.id === 'contact');
        const contactActive = contactStep?.status === 'in_progress';

        if (payload?.pending || contactActive) {
          this.selectedStageId.set('calls');
          this.expandedSubStepId.set('contact');
          if (payload?.callId) {
            this.callsSelectedId.set(payload.callId);
          } else if (linkedId) {
            this.callsSelectedId.set(linkedId);
          }
        } else if (payload?.terminal || recordingReady) {
          this.callsSelectedId.set(payload?.callId ?? linkedId);
          if (recordingReady) {
            this.expandedSubStepId.set('recording');
          }
        }

        if (canOpenPowerApp(updated)) {
          this.selectedStageId.set('power_app');
          this.showFeedback('Contacto calificado. Ya puede diligenciar la solicitud Power App.');
        }
      },
    });
  }

  private applyCallsExpansion(pipeline: CompanyPipeline, historyCount: number): void {
    const query = this.route.snapshot.queryParamMap;
    const accion = query.get('accion');
    const historial = query.get('historial') === '1';
    const etapa = query.get('etapa');
    const callsStage = pipeline.stages.find((s) => s.id === 'calls');
    const linkedCallId = callsStage?.linkedCallId;
    const recordingStep = callsStage?.subSteps.find((s) => s.id === 'recording');
    const recordingReady =
      recordingStep?.status === 'in_progress' || recordingStep?.status === 'completed';

    if (accion === 'auto' || accion === 'manual') {
      this.expandedSubStepId.set('contact');
      return;
    }

    if ((historial || historyCount > 0) && recordingReady) {
      this.expandedSubStepId.set('recording');
      if (linkedCallId) {
        this.callsSelectedId.set(linkedCallId);
      }
      return;
    }

    if (etapa === 'calls' || historyCount > 0) {
      this.expandedSubStepId.set('contact');
    }
  }

  private preloadCallsHistory(pipeline: CompanyPipeline): void {
    const nit = pipeline.clienteId ?? pipeline.nit;
    this.repository.getCallsForCompany(nit).subscribe({
      next: (calls) => {
        this.callsCount.set(calls.length);
        this.applyCallsExpansion(pipeline, calls.length);
      },
    });
  }

  private loadPowerAppSubmission(pipeline: CompanyPipeline): void {
    const nit = pipeline.clienteId ?? pipeline.nit;
    const cached = this.submissionStore.getRecord(pipeline.id);
    if (cached?.response.valid) {
      this.powerAppSubmission.set(cached);
    }

    if (!pipeline.powerAppSubmittedAt && !cached?.response.valid) {
      this.powerAppSubmission.set(null);
      return;
    }

    this.powerAppService.getSubmissionByLead(nit).subscribe({
      next: ({ submission }) => {
        if (submission) {
          this.submissionStore.saveFromApiRecord(pipeline.id, submission);
          this.powerAppSubmission.set(this.submissionStore.getRecord(pipeline.id) ?? null);
          return;
        }
        if (cached?.response.valid) {
          this.powerAppSubmission.set(cached);
          return;
        }
        this.powerAppSubmission.set(null);
      },
    });
  }

}
