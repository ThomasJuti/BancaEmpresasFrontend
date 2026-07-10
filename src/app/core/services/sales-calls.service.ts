import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SALES_CALLS_API } from '../config/api.config';

// Servicio transversal (core) para disparar llamadas de venta contra el backend
// sales-calls. Vive en core/ para que features como portfolio puedan usarlo sin
// importar internals de la feature calls (regla de comunicación entre features).

export interface InitiateCallRequest {
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  variables?: Record<string, string>;
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

@Injectable({ providedIn: 'root' })
export class SalesCallsService {
  private readonly http = inject(HttpClient);

  initiateCall(request: InitiateCallRequest): Observable<InitiatedCall> {
    return this.http.post<InitiatedCall>(`${SALES_CALLS_API}/calls`, request);
  }

  createBatch(request: CreateBatchRequest): Observable<CreatedBatch> {
    return this.http.post<CreatedBatch>(`${SALES_CALLS_API}/batches`, request);
  }
}
