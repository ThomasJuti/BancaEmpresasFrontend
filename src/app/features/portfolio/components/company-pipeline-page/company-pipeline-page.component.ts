import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PowerAppFormModalComponent } from '../../../power-apps/components/power-app-form-modal/power-app-form-modal.component';
import { PowerAppSubmitResponse } from '../../../power-apps/models/power-app-submit.model';
import { PipelineAction, PipelineStageId } from '../../models/pipeline-stage.model';
import { CompanyPipeline } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import {
  activationStatusLabel,
  computeFollowUpSchedule,
  stepStatusLabel,
} from '../../utils/follow-up.util';
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
  readonly lastRadicado = signal<string | null>(null);

  readonly selectedStage = computed(() => {
    const p = this.pipeline();
    if (!p) return null;
    return p.stages.find((s) => s.id === this.selectedStageId()) ?? null;
  });

  readonly followUpSchedule = computed(() => {
    const p = this.pipeline();
    if (!p) return null;
    return computeFollowUpSchedule(p.cardShippedAt, p.activatedAt, p.activationStatus);
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
        this.pipeline.set(pipeline);
        this.selectedStageId.set(pipeline.currentStageId);
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
    if (action.id === 'fill_power_app') {
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
    if (!result.valid) return;

    this.lastRadicado.set(result.radicado);
    const p = this.pipeline();
    if (!p) return;

    this.actionLoading.set(true);
    this.repository.executeAction(p.id, 'power_app', 'power_app_approved').subscribe({
      next: (actionResult) => {
        if (actionResult.pipeline) {
          this.pipeline.set(actionResult.pipeline);
          this.selectedStageId.set(actionResult.pipeline.currentStageId);
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
  }

  closePowerAppModal(): void {
    this.showPowerAppModal.set(false);
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
