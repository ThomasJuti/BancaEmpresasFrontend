import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SALES_CALLS_API } from '../../../core/config/api.config';
import { Call } from '../models/call.model';

@Injectable({ providedIn: 'root' })
export class CallsService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<Call[]> {
    return this.http.get<Call[]>(`${SALES_CALLS_API}/calls`);
  }

  getById(id: string): Observable<Call> {
    return this.http.get<Call>(`${SALES_CALLS_API}/calls/${id}`);
  }
}
