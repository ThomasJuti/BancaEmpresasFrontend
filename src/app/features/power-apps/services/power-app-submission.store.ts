import { Injectable } from '@angular/core';
import {
  PowerAppSubmissionPayload,
  PowerAppSubmissionRecord,
  PowerAppSubmitResponse,
  StoredPowerAppSubmission,
} from '../models/power-app-submit.model';

const STORAGE_KEY = 'power_app_submissions_v2';

/** Estado de envío Power App por empresa. Usa sessionStorage para UX inmediata tras submit. */
@Injectable({ providedIn: 'root' })
export class PowerAppSubmissionStore {
  private readonly submissions = new Map<string, StoredPowerAppSubmission>();

  constructor() {
    this.restoreFromSession();
  }

  has(companyId: string): boolean {
    return this.submissions.has(companyId);
  }

  get(companyId: string): PowerAppSubmitResponse | undefined {
    return this.submissions.get(companyId)?.response;
  }

  getRecord(companyId: string): StoredPowerAppSubmission | undefined {
    return this.submissions.get(companyId);
  }

  save(
    companyId: string,
    result: PowerAppSubmitResponse,
    extras?: {
      payload?: PowerAppSubmissionPayload;
      attachmentNames?: string[];
      documentoOrigen?: 'RUES' | 'MANUAL';
    },
  ): void {
    if (!result.valid) {
      return;
    }
    this.submissions.set(companyId, {
      response: result,
      payload: extras?.payload,
      attachmentNames: extras?.attachmentNames,
      documentoOrigen: extras?.documentoOrigen,
    });
    this.persistToSession();
  }

  saveFromApiRecord(companyId: string, record: PowerAppSubmissionRecord): void {
    this.submissions.set(companyId, {
      response: {
        caseId: record.caseId,
        decision: record.decision,
        valid: record.valid,
        radicado: record.radicado,
        issues: record.issues,
        summary: record.summary,
        siguientePaso: record.siguientePaso,
        submittedAt: record.submittedAt,
      },
      payload: record.payload,
      attachmentNames: record.attachmentNames,
      documentoOrigen: record.documentoOrigen,
    });
    this.persistToSession();
  }

  clear(companyId: string): void {
    this.submissions.delete(companyId);
    this.persistToSession();
  }

  private restoreFromSession(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem('power_app_submissions_v1');
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, StoredPowerAppSubmission | PowerAppSubmitResponse>;
      for (const [companyId, entry] of Object.entries(parsed)) {
        if ('response' in entry && entry.response?.valid) {
          this.submissions.set(companyId, entry);
        } else if ('valid' in entry && entry.valid) {
          this.submissions.set(companyId, { response: entry as PowerAppSubmitResponse });
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('power_app_submissions_v1');
    }
  }

  private persistToSession(): void {
    const payload = Object.fromEntries(this.submissions);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
}
