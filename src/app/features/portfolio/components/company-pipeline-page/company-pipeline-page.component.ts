import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FollowUpService } from '../../../../core/services/follow-up.service';
import { PowerAppFormModalComponent } from '../../../power-apps/components/power-app-form-modal/power-app-form-modal.component';
import { PowerAppSubmitResponse } from '../../../power-apps/models/power-app-submit.model';
import { PowerAppSubmissionStore } from '../../../power-apps/services/power-app-submission.store';
import { PipelineAction, PipelineStageId } from '../../models/pipeline-stage.model';
import { CompanyPipeline } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import { activationStatusLabel, stepStatusLabel } from '../../utils/follow-up.util';
import { computeProgress } from '../../utils/pipeline-builder';
import { PipelineStepperComponent } from '../pipeline-stepper/pipeline-stepper.component';
import { StageDetailPanelComponent } from '../stage-detail-panel/stage-detail-panel.component';

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
  private readonly followUpService = inject(FollowUpService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  readonly selectedStage = computed(() => {
    const p = this.pipeline();
    if (!p) return null;
    return p.stages.find((s) => s.id === this.selectedStageId()) ?? null;
  });

  statusLabel = activationStatusLabel;
  stepLabel = stepStatusLabel;

  ngOnInit(): void {
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
        this.selectedStageId.set(restored.currentStageId);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se encontró la empresa solicitada.');
        this.loading.set(false);
      },
    });
  }

  selectStage(stageId: PipelineStageId): void {
    this.selectedStageId.set(stageId);
  }

  onActionRequested(action: PipelineAction): void {
    if (action.id === 'fill_power_app' || action.id === 'view_power_app_result') {
      const p = this.pipeline();
      if (!p) return;

      const stored = this.submissionStore.get(p.id);
      if (stored?.valid || p.powerAppSubmittedAt) {
        this.powerAppReadOnly.set(true);
      } else {
        this.powerAppReadOnly.set(false);
      }
      this.showPowerAppModal.set(true);
      return;
    }

    if (action.id === 'view_call') {
      void this.router.navigate(['/llamadas'], { queryParams: { callId: this.selectedStage()?.linkedCallId } });
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

  /**
   * Check único del punto 5: llama al backend (idempotente). La primera vez el
   * backend dispara la llamada de felicitación y crea el caso de seguimiento;
   * luego se refleja el check en el pipeline local.
   */
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
          // Refleja el check localmente (el estado durable vive en el backend).
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

  badgeStatus(status: string): string {
    if (status === 'activated') return 'activated';
    if (status === 'at_risk') return 'at_risk';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
  }
}
