import { Injectable } from '@angular/core';
import { PowerAppSubmitResponse } from '../models/power-app-submit.model';

const STORAGE_KEY = 'power_app_submissions_v1';

/** Estado de envío Power App por empresa. Usa sessionStorage para sobrevivir recargas de página. */
@Injectable({ providedIn: 'root' })
export class PowerAppSubmissionStore {
  private readonly submissions = new Map<string, PowerAppSubmitResponse>();

  constructor() {
    this.restoreFromSession();
  }

  has(companyId: string): boolean {
    return this.submissions.has(companyId);
  }

  get(companyId: string): PowerAppSubmitResponse | undefined {
    return this.submissions.get(companyId);
  }

  save(companyId: string, result: PowerAppSubmitResponse): void {
    if (!result.valid) {
      return;
    }
    this.submissions.set(companyId, result);
    this.persistToSession();
  }

  clear(companyId: string): void {
    this.submissions.delete(companyId);
    this.persistToSession();
  }

  private restoreFromSession(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, PowerAppSubmitResponse>;
      for (const [companyId, result] of Object.entries(parsed)) {
        if (result.valid) {
          this.submissions.set(companyId, result);
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private persistToSession(): void {
    const payload = Object.fromEntries(this.submissions);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
}
