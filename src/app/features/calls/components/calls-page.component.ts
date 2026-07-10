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
}
