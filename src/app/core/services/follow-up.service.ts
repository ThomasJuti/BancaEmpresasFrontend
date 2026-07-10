import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ACTIVATION_FOLLOW_UP_API } from '../config/api.config';

/** Fase del seguimiento según días sin uso (la TC se inactiva a los 90 días). */
export type FollowUpFase = 'al_dia' | 'mes_1' | 'mes_2' | 'mes_3';

/** Caso de seguimiento de uso de una TC entregada (calculado por el backend). */
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

/**
 * Cliente HTTP de la etapa activation-follow-up (transversal: lo usan el
 * portafolio —check de entrega finalizada— y la vista lateral Seguimiento).
 */
@Injectable({ providedIn: 'root' })
export class FollowUpService {
  private readonly http = inject(HttpClient);
  private readonly base = ACTIVATION_FOLLOW_UP_API;

  /** Check punto 5: la primera vez felicita al cliente y arranca el seguimiento. */
  finalizeDelivery(request: FinalizeDeliveryRequest): Observable<FinalizeDeliveryResponse> {
    return this.http.post<FinalizeDeliveryResponse>(`${this.base}/cases`, request);
  }

  listCases(): Observable<{ total: number; casos: FollowUpCase[] }> {
    return this.http.get<{ total: number; casos: FollowUpCase[] }>(`${this.base}/cases`);
  }

  /** Simula un uso de la tarjeta (demo); reinicia el ciclo de recordatorios. */
  registerUsage(clienteId: string): Observable<{ caso: FollowUpCase }> {
    return this.http.post<{ caso: FollowUpCase }>(
      `${this.base}/cases/${encodeURIComponent(clienteId)}/usage`,
      {},
    );
  }
}
