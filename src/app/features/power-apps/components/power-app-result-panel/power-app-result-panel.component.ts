import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PowerAppDecision, PowerAppSubmitResponse } from '../../models/power-app-submit.model';

@Component({
  selector: 'app-power-app-result-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './power-app-result-panel.component.html',
  styleUrls: ['./power-app-result-panel.component.css'],
})
export class PowerAppResultPanelComponent {
  @Input({ required: true }) result!: PowerAppSubmitResponse;
  @Input() allowRetry = false;
  @Output() retry = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  get decisionTone(): 'success' | 'warning' | 'danger' {
    return this.mapDecision(this.result.decision);
  }

  decisionBadge(status: string): string {
    if (status === 'APROBADO') return 'activated';
    if (status === 'DEVUELTO') return 'alert';
    return 'at_risk';
  }

  private mapDecision(decision: PowerAppDecision): 'success' | 'warning' | 'danger' {
    if (decision === 'APROBADO') return 'success';
    if (decision === 'DEVUELTO') return 'warning';
    return 'danger';
  }
}
