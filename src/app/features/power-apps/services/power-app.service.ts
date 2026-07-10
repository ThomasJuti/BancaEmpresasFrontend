import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { FILE_MATCHING_API, POWER_APPS_API, SALES_CALLS_API } from '../../../core/config/api.config';
import { ClienteFinal, ClienteFinalByIdResponse, ClientesFinalesResponse } from '../models/cliente-final.model';
import { PowerAppHandoffPrefill } from '../models/power-app-prefill.model';
import { PowerAppSubmitRequest, PowerAppSubmitResponse } from '../models/power-app-submit.model';
import { RuesConsultarResponse, RuesFormSnapshot } from '../models/rues-consultation.model';
import { normalizeIdentification } from '../utils/colombian-id.util';

@Injectable({ providedIn: 'root' })
export class PowerAppService {
  constructor(private readonly http: HttpClient) {}

  getClientesFinales(): Observable<ClienteFinal[]> {
    return this.http
      .get<ClientesFinalesResponse>(`${FILE_MATCHING_API}/clientes-finales`)
      .pipe(map((res) => res.clientes ?? []));
  }

  getClienteByNit(nit: string): Observable<ClienteFinal | null> {
    const clienteId = normalizeIdentification(nit.trim());
    if (!clienteId) {
      return of(null);
    }

    return this.http
      .get<ClienteFinalByIdResponse>(
        `${FILE_MATCHING_API}/clientes-finales/${encodeURIComponent(clienteId)}`,
      )
      .pipe(
        map((res) => res.cliente ?? null),
        catchError(() => of(null)),
      );
  }

  getHandoffPrefill(callId: string): Observable<PowerAppHandoffPrefill | null> {
    if (!callId.trim()) {
      return of(null);
    }

    return this.http
      .get<PowerAppHandoffPrefill>(`${SALES_CALLS_API}/calls/${encodeURIComponent(callId)}/handoff`)
      .pipe(catchError(() => of(null)));
  }

  consultarRues(nit: string, form?: RuesFormSnapshot): Observable<RuesConsultarResponse> {
    const body: { nit: string; form?: RuesFormSnapshot } = { nit };
    if (form && Object.values(form).some((value) => value?.trim())) {
      body.form = form;
    }
    return this.http.post<RuesConsultarResponse>(`${POWER_APPS_API}/rues/consultar`, body);
  }

  ruesHealth(): Observable<{ enabled: boolean; status?: string }> {
    return this.http.get<{ enabled: boolean; status?: string }>(`${POWER_APPS_API}/rues/health`).pipe(
      catchError(() => of({ enabled: false })),
    );
  }

  submit(request: PowerAppSubmitRequest): Observable<PowerAppSubmitResponse> {
    return this.http.post<PowerAppSubmitResponse>(`${POWER_APPS_API}/submit`, request).pipe(
      catchError((err: HttpErrorResponse) => {
        const body = err.error as PowerAppSubmitResponse | undefined;
        if (body?.decision) {
          return of(body);
        }
        return throwError(() => err);
      }),
    );
  }
}
