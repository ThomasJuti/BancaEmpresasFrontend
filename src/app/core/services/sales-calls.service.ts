import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SALES_CALLS_API } from '../config/api.config';

export interface InitiateCallRequest {
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  variables?: Record<string, string>;
  caseId?: string;
}

export interface InitiatedCall {
  id: string;
  status: string;
  phoneNumber: string;
  customerName?: string;
}

export interface BatchLead {
  leadId: string;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  variables?: Record<string, string>;
  caseId?: string;
}

export interface CreateBatchRequest {
  name: string;
  leads: BatchLead[];
}

export interface CreatedBatch {
  id: string;
  name: string;
  status: string;
}

export type CallStatus = 'queued' | 'initiated' | 'in_progress' | 'completed' | 'failed';

export interface TranscriptMessage {
  role: string;
  message: string;
}

/** Vista completa de una llamada para paneles de detalle por cliente. */
export interface CallDetail {
  id: string;
  sessionId?: string;
  caseId?: string;
  agentId: string;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  variables: Record<string, string>;
  outputVariables?: Record<string, string>;
  status: CallStatus;
  recordingUrl?: string;
  transcript?: TranscriptMessage[];
  summary?: string;
  endedReason?: string;
  startedAt?: string;
  durationSeconds?: number;
  successEvaluation?: boolean | string;
  structuredData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Vista mínima de una llamada para correlacionar el estado del pipeline por cliente. */
export type CallRecord = Pick<
  CallDetail,
  'id' | 'phoneNumber' | 'status' | 'recordingUrl' | 'successEvaluation' | 'variables' | 'updatedAt'
>;

export interface RegisterManualCallRequest {
  phoneNumber?: string;
  customerName: string;
  customerEmail?: string;
  variables: {
    empresa: string;
    nit: string;
  };
  identidadVerificada: boolean;
  clienteInteresado: boolean;
  motivoNoInteres?: string;
  summary?: string;
  durationSeconds?: number;
}

export interface SyncPipelineFromCallResult {
  callId: string;
  caseId: string;
  stage: string;
  advanced: boolean;
  alreadyAtOrPastPowerApps: boolean;
}

@Injectable({ providedIn: 'root' })
export class SalesCallsService {
  private readonly http = inject(HttpClient);

  initiateCall(request: InitiateCallRequest): Observable<InitiatedCall> {
    return this.http.post<InitiatedCall>(`${SALES_CALLS_API}/calls`, request);
  }

  createBatch(request: CreateBatchRequest): Observable<CreatedBatch> {
    return this.http.post<CreatedBatch>(`${SALES_CALLS_API}/batches`, request);
  }

  listCalls(): Observable<CallDetail[]> {
    return this.http.get<CallDetail[]>(`${SALES_CALLS_API}/calls`);
  }

  getCall(id: string): Observable<CallDetail> {
    return this.http.get<CallDetail>(`${SALES_CALLS_API}/calls/${id}`);
  }

  registerManual(request: RegisterManualCallRequest): Observable<CallDetail> {
    return this.http.post<CallDetail>(`${SALES_CALLS_API}/calls/manual`, request);
  }

  /**
   * Recuperación idempotente: si la llamada calificó pero el pipeline no avanzó
   * a power_apps, fuerza el sync (p. ej. llamadas históricas sin caseId).
   */
  syncPipelineFromCall(callId: string): Observable<SyncPipelineFromCallResult> {
    return this.http.post<SyncPipelineFromCallResult>(
      `${SALES_CALLS_API}/calls/${encodeURIComponent(callId)}/sync-pipeline`,
      {},
    );
  }

  recordingUrl(callId: string): string {
    return `${SALES_CALLS_API}/calls/${callId}/recording`;
  }
}
