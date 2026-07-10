import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { SALES_CALLS_API } from '../../../core/config/api.config';
import { CallsService } from '../services/calls.service';
import { Call } from '../models/call.model';

@Component({
  selector: 'app-calls-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calls-page.component.html',
  styleUrls: ['./calls-page.component.css'],
})
export class CallsPageComponent implements OnInit {
  readonly calls = signal<Call[]>([]);
  readonly selected = signal<Call | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor(private readonly callsService: CallsService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.callsService.list().subscribe({
      next: (calls) => {
        this.calls.set(calls);
        if (!this.selected() && calls.length > 0) {
          this.selected.set(calls[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar las llamadas. ¿El backend está corriendo en el puerto 3000?');
        this.loading.set(false);
      },
    });
  }

  select(call: Call): void {
    this.selected.set(call);
  }

  // URL del proxy del backend que sirve el audio con la API key (el link
  // directo de Fonema exige el header Authorization, que el navegador no envía).
  recordingUrl(call: Call): string {
    return `${SALES_CALLS_API}/calls/${call.id}/recording`;
  }

  statusLabel(status: Call['status']): string {
    const labels: Record<Call['status'], string> = {
      queued: 'En cola',
      initiated: 'Iniciada',
      in_progress: 'En curso',
      completed: 'Completada',
      failed: 'Fallida',
    };
    return labels[status] ?? status;
  }

  structuredEntries(data?: Record<string, unknown>): { key: string; value: string }[] {
    if (!data) {
      return [];
    }
    return Object.entries(data).map(([key, value]) => ({ key, value: String(value) }));
  }

  isSuccess(value?: boolean | string): boolean {
    return value === true || value === 'true' || value === 'Verdadero';
  }

  // --- Resultado de la llamada (variables de salida de Fonema) ---

  /** Claves de titular que se muestran aparte y no se repiten en "Datos extraídos". */
  private readonly HEADLINE_KEYS = ['identidad_verificada', 'cliente_interesado', 'motivo_no_interes'];

  /** ¿Se verificó la identidad del representante? null si el agente no lo reportó. */
  identityVerified(call: Call): boolean | null {
    return this.truthiness(this.readVar(call, ['identidad_verificada', 'identidadVerificada']));
  }

  /** ¿El cliente quedó interesado? null si el agente no lo reportó. */
  clientInterested(call: Call): boolean | null {
    return this.truthiness(this.readVar(call, ['cliente_interesado', 'clienteInteresado']));
  }

  /** Motivo declarado de no interés, si lo hay. */
  noInterestReason(call: Call): string | null {
    return this.readVar(call, ['motivo_no_interes', 'motivo_no_interés', 'motivoNoInteres']) ?? null;
  }

  /** Variables de salida extraídas por el agente, sin las de titular. */
  outputEntries(call: Call): { key: string; value: string }[] {
    if (!call.outputVariables) {
      return [];
    }
    return Object.entries(call.outputVariables)
      .filter(([key]) => !this.HEADLINE_KEYS.includes(key.toLowerCase()))
      .map(([key, value]) => ({ key, value: String(value) }));
  }

  /** Busca una clave (case-insensitive) entre outputVariables y structuredData. */
  private readVar(call: Call, keys: string[]): string | undefined {
    const wanted = keys.map((k) => k.toLowerCase());
    const sources: Record<string, unknown>[] = [call.outputVariables ?? {}, call.structuredData ?? {}];
    for (const source of sources) {
      for (const [key, value] of Object.entries(source)) {
        if (wanted.includes(key.toLowerCase()) && value != null && String(value).trim() !== '') {
          return String(value);
        }
      }
    }
    return undefined;
  }

  /** Interpreta un string booleano de Fonema (es/en). null si es ambiguo/ausente. */
  private truthiness(value: string | undefined): boolean | null {
    if (value == null) {
      return null;
    }
    const v = value.trim().toLowerCase();
    if (['true', 'si', 'sí', 'verdadero', 'yes', '1'].includes(v)) {
      return true;
    }
    if (['false', 'no', 'falso', '0'].includes(v)) {
      return false;
    }
    return null;
  }
}
