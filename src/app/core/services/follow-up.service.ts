import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ACTIVATION_FOLLOW_UP_API } from '../config/api.config';

export type FollowUpFase = 'al_dia' | 'mes_1' | 'mes_2' | 'mes_3';

export interface FollowUpCase {
  id: string;
  clienteId: string;
  caseId: string | null;
  clienteNombre: string | null;
  telefono: string | null;
  correo: string | null;
  deliveredAt: string;
  congratulatedAt: string | null;
  congratulationCallId: string | null;
  lastUsedAt: string;
  lastReminderAt: string | null;
  reminderCount: number;
  diasSinUso: number;
  fase: FollowUpFase;
  riesgoInactivacion: boolean;
  diasParaInactivacion: number;
  proximaLlamadaEstimada: string | null;
}

export interface FinalizeDeliveryRequest {
  clienteId: string;
  nombre?: string;
  telefono?: string;
  correo?: string;
}

export interface FinalizeDeliveryResponse {
  caso: FollowUpCase;
  llamadaFelicitacionIniciada: boolean;
  yaExistia: boolean;
}

@Injectable({ providedIn: 'root' })
export class FollowUpService {
  private readonly http = inject(HttpClient);
  private readonly base = ACTIVATION_FOLLOW_UP_API;

  finalizeDelivery(request: FinalizeDeliveryRequest): Observable<FinalizeDeliveryResponse> {
    return this.http.post<FinalizeDeliveryResponse>(`${this.base}/cases`, request);
  }

  listCases(): Observable<{ total: number; casos: FollowUpCase[] }> {
    return this.http.get<{ total: number; casos: FollowUpCase[] }>(`${this.base}/cases`);
  }

  processReminders(): Observable<{ resumen: { procesados: number; llamadasIniciadas: number; errores: number } }> {
    return this.http.post<{ resumen: { procesados: number; llamadasIniciadas: number; errores: number } }>(
      `${this.base}/cases/process-reminders`,
      {},
    );
  }

  registerUsage(clienteId: string): Observable<{ caso: FollowUpCase }> {
    return this.http.post<{ caso: FollowUpCase }>(
      `${this.base}/cases/${encodeURIComponent(clienteId)}/usage`,
      {},
    );
  }
}
