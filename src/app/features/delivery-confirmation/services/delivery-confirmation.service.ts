import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DELIVERY_CONFIRMATION_API } from '../../../core/config/api.config';
import { ConfirmResult, ConfirmationView, DeliveryOutcome } from '../models/confirmation.model';

@Injectable({ providedIn: 'root' })
export class DeliveryConfirmationService {
  private readonly http = inject(HttpClient);

  getByToken(token: string): Observable<ConfirmationView> {
    return this.http.get<ConfirmationView>(
      `${DELIVERY_CONFIRMATION_API}/confirmations/${encodeURIComponent(token)}`,
    );
  }

  confirm(token: string, outcome: DeliveryOutcome): Observable<ConfirmResult> {
    return this.http.post<ConfirmResult>(`${DELIVERY_CONFIRMATION_API}/confirm`, {
      token,
      outcome,
    });
  }
}
