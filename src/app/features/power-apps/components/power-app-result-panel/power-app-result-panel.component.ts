import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PowerAppSubmitResponse } from '../../models/power-app-submit.model';

@Component({
  selector: 'app-power-app-result-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './power-app-result-panel.component.html',
  styleUrls: ['./power-app-result-panel.component.css'],
})
export class PowerAppResultPanelComponent {
  @Input({ required: true }) result!: PowerAppSubmitResponse;
  @Output() retry = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  decisionBadge(status: string): string {
    if (status === 'APROBADO') return 'activated';
    if (status === 'DEVUELTO') return 'alert';
    return 'at_risk';
  }
}
