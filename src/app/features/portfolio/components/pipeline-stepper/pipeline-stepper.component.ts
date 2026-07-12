import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PIPELINE_STAGE_ORDER, PipelineStage, PipelineStageId } from '../../models/pipeline-stage.model';

@Component({
  selector: 'app-pipeline-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipeline-stepper.component.html',
  styleUrls: ['./pipeline-stepper.component.css'],
})
export class PipelineStepperComponent {
  @Input({ required: true }) stages!: PipelineStage[];
  @Input({ required: true }) selectedStageId!: PipelineStageId | '';
  @Output() stageSelected = new EventEmitter<PipelineStageId>();

  readonly order = PIPELINE_STAGE_ORDER;

  selectStage(stageId: PipelineStageId): void {
    if (this.stageById(stageId)?.status === 'blocked') {
      return;
    }
    this.stageSelected.emit(stageId);
  }

  stageById(id: PipelineStageId): PipelineStage | undefined {
    return this.stages.find((s) => s.id === id);
  }

  connectorClass(index: number): string {
    const stage = this.stageById(this.order[index]);
    return stage?.status === 'completed' ? 'completed' : '';
  }
}
