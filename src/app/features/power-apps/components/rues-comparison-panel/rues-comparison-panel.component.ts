import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ValidationIssue } from '../../models/power-app-submit.model';
import { RuesConsultation } from '../../models/rues-consultation.model';

@Component({
  selector: 'app-rues-comparison-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rues-comparison-panel.component.html',
  styleUrls: ['./rues-comparison-panel.component.css'],
})
export class RuesComparisonPanelComponent {
  @Input({ required: true }) consultation!: RuesConsultation;
  @Input() issues: ValidationIssue[] = [];
  @Input() mock = false;

  matriculaEstado(): string {
    return (
      this.consultation.datos['Estado de la matrícula'] ??
      this.consultation.datos['Estado de la matricula'] ??
      '—'
    );
  }

  camara(): string {
    return this.consultation.datos['Cámara de Comercio'] ?? '—';
  }
}
