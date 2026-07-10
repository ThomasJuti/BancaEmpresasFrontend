import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  PowerAppSubmissionPayload,
  PowerAppSubmitResponse,
  StoredPowerAppSubmission,
} from '../../models/power-app-submit.model';
import {
  POWER_APP_FIELD_ENTRIES,
  PowerAppFieldEntry,
  formatPowerAppFieldValue,
  powerAppSectionTitle,
} from '../../utils/power-app-field-labels.util';

@Component({
  selector: 'app-power-app-submission-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './power-app-submission-history.component.html',
  styleUrls: ['./power-app-submission-history.component.css'],
})
export class PowerAppSubmissionHistoryComponent {
  @Input({ required: true }) result!: PowerAppSubmitResponse;
  @Input() payload?: PowerAppSubmissionPayload;
  @Input() attachmentNames: string[] = [];
  @Input() documentoOrigen?: 'RUES' | 'MANUAL';
  @Input() compact = false;

  readonly sections: PowerAppFieldEntry['section'][] = ['cliente', 'tarjeta', 'entrega', 'documentos'];

  static fromStored(stored: StoredPowerAppSubmission): {
    result: PowerAppSubmitResponse;
    payload?: PowerAppSubmissionPayload;
    attachmentNames: string[];
    documentoOrigen?: 'RUES' | 'MANUAL';
  } {
    return {
      result: stored.response,
      payload: stored.payload,
      attachmentNames: stored.attachmentNames ?? [],
      documentoOrigen: stored.documentoOrigen,
    };
  }

  sectionTitle(section: PowerAppFieldEntry['section']): string {
    return powerAppSectionTitle(section);
  }

  fieldsForSection(section: PowerAppFieldEntry['section']): PowerAppFieldEntry[] {
    return POWER_APP_FIELD_ENTRIES.filter((entry) => entry.section === section);
  }

  fieldValue(entry: PowerAppFieldEntry): string {
    if (!this.payload) {
      return '—';
    }
    return formatPowerAppFieldValue(entry, this.payload[entry.key as keyof PowerAppSubmissionPayload]);
  }

  hasPayload(): boolean {
    return !!this.payload;
  }

  hasAttachments(): boolean {
    return this.attachmentNames.length > 0;
  }

  documentoOrigenLabel(): string | null {
    if (!this.documentoOrigen) {
      return null;
    }
    return this.documentoOrigen === 'RUES' ? 'Consulta RUES' : 'PDF manual';
  }

  decisionBadge(status: string): string {
    if (status === 'APROBADO') return 'activated';
    if (status === 'DEVUELTO') return 'alert';
    return 'at_risk';
  }
}
