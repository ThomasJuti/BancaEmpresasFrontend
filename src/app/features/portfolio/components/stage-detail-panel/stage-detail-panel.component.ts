import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PipelineAction, PipelineStage } from '../../models/pipeline-stage.model';
import { CompanyPipeline } from '../../models/portfolio-company.model';
import { resolveStageActions } from '../../utils/pipeline-builder';
import { canOpenPowerApp } from '../../utils/pipeline-access.util';
import { stepStatusLabel } from '../../utils/follow-up.util';
import { CompanyCallsPanelComponent } from '../company-calls-panel/company-calls-panel.component';

@Component({
  selector: 'app-stage-detail-panel',
  standalone: true,
  imports: [CommonModule, CompanyCallsPanelComponent],
  templateUrl: './stage-detail-panel.component.html',
  styleUrls: ['./stage-detail-panel.component.css'],
})
export class StageDetailPanelComponent {
  @Input({ required: true }) stage!: PipelineStage;
  @Input({ required: true }) pipeline!: CompanyPipeline;
  @Input() actionLoading = false;
  @Input() expandedSubStepId: string | null = null;
  @Input() callsFocusAction: 'auto' | 'manual' | null = null;
  @Input() selectedCallId: string | null = null;
  @Input() callsRefreshKey = 0;
  @Input() callsCount = 0;
  @Output() actionRequested = new EventEmitter<PipelineAction>();
  @Output() expandedSubStepChange = new EventEmitter<string | null>();
  @Output() callsChanged = new EventEmitter<void>();

  statusLabel = stepStatusLabel;

  visibleActions(): PipelineAction[] {
    return resolveStageActions(this.stage, this.pipeline);
  }

  showPowerAppGateMessage(): boolean {
    return this.stage.id === 'power_app' && !canOpenPowerApp(this.pipeline);
  }

  isCallsStage(): boolean {
    return this.stage.id === 'calls';
  }

  isExpandableSubStep(stepId: string): boolean {
    if (!this.isCallsStage()) {
      return false;
    }
    if (stepId === 'contact') {
      return true;
    }
    if (stepId === 'recording') {
      return this.isRecordingAccessible();
    }
    return false;
  }

  isRecordingAccessible(): boolean {
    const recording = this.stage.subSteps.find((s) => s.id === 'recording');
    return recording?.status === 'in_progress' || recording?.status === 'completed';
  }

  isSubStepLocked(stepId: string): boolean {
    if (!this.isCallsStage() || stepId === 'contact') {
      return false;
    }
    const step = this.stage.subSteps.find((s) => s.id === stepId);
    return step?.status === 'pending';
  }

  isExpanded(stepId: string): boolean {
    return this.expandedSubStepId === stepId;
  }

  toggleSubStep(stepId: string): void {
    if (!this.isExpandableSubStep(stepId)) {
      return;
    }
    const next = this.expandedSubStepId === stepId ? null : stepId;
    this.expandedSubStepChange.emit(next);
  }

  onGoToContact(): void {
    this.expandedSubStepChange.emit('contact');
  }

  companyNit(): string {
    return this.pipeline.clienteId ?? this.pipeline.nit;
  }

  recordingCountLabel(): string | null {
    if (this.callsCount <= 1) {
      return null;
    }
    return `(${this.callsCount} contactos)`;
  }

  subStepDescription(stepId: string, defaultDescription: string): string {
    if (stepId !== 'recording' || !this.isRecordingAccessible()) {
      return defaultDescription;
    }
    if (this.callsCount === 0) {
      return defaultDescription;
    }
    if (this.callsCount === 1) {
      return 'Seguimiento del contacto de esta empresa';
    }
    return 'Historial de contactos de esta empresa';
  }

  requestAction(action: PipelineAction): void {
    if (!this.actionLoading) {
      this.actionRequested.emit(action);
    }
  }
}
