import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { FILE_MATCHING_API, POWER_APPS_API } from '../../../core/config/api.config';
import { ClienteFinal, ClientesFinalesResponse } from '../models/cliente-final.model';
import { PowerAppSubmitRequest, PowerAppSubmitResponse } from '../models/power-app-submit.model';
import { normalizeNit } from '../utils/build-prefill.util';

@Injectable({ providedIn: 'root' })
export class PowerAppService {
  constructor(private readonly http: HttpClient) {}

  getClientesFinales(): Observable<ClienteFinal[]> {
    return this.http
      .get<ClientesFinalesResponse>(`${FILE_MATCHING_API}/clientes-finales`)
      .pipe(map((res) => res.clientes ?? []));
  }

  getClienteByNit(nit: string): Observable<ClienteFinal | null> {
    const normalized = normalizeNit(nit);
    return this.getClientesFinales().pipe(
      map((clientes) => clientes.find((c) => normalizeNit(c.clienteId) === normalized) ?? null),
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
