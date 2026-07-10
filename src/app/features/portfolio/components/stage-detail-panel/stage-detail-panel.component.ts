import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PipelineAction, PipelineStage } from '../../models/pipeline-stage.model';
import { CompanyPipeline } from '../../models/portfolio-company.model';
import { resolveStageActions } from '../../utils/pipeline-builder';
import { stepStatusLabel } from '../../utils/follow-up.util';

@Component({
  selector: 'app-stage-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stage-detail-panel.component.html',
  styleUrls: ['./stage-detail-panel.component.css'],
})
export class StageDetailPanelComponent {
  @Input({ required: true }) stage!: PipelineStage;
  @Input({ required: true }) pipeline!: CompanyPipeline;
  @Input() actionLoading = false;
  @Output() actionRequested = new EventEmitter<PipelineAction>();

  statusLabel = stepStatusLabel;

  visibleActions(): PipelineAction[] {
    return resolveStageActions(this.stage, this.pipeline);
  }

  requestAction(action: PipelineAction): void {
    if (!this.actionLoading) {
      this.actionRequested.emit(action);
    }
  }
}
