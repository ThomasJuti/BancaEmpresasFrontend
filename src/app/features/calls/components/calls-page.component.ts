import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SALES_CALLS_API } from '../../../core/config/api.config';
import { isValidE164, toE164 } from '../../../shared/utils/phone.util';
import { Call } from '../models/call.model';
import { CallsService } from '../services/calls.service';

@Component({
  selector: 'app-calls-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calls-page.component.html',
  styleUrls: ['./calls-page.component.css'],
})
export class CallsPageComponent implements OnInit {
  readonly calls = signal<Call[]>([]);
  readonly selected = signal<Call | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showManualForm = signal(false);
  readonly savingManual = signal(false);
  readonly manualError = signal<string | null>(null);
  readonly manualSuccess = signal<string | null>(null);

  readonly manualEmpresa = signal('');
  readonly manualNit = signal('');
  readonly manualContacto = signal('');
  readonly manualPhone = signal('');
  readonly manualIdentidad = signal(false);
  readonly manualInteresado = signal(false);
  readonly manualMotivo = signal('');
  readonly manualSummary = signal('');
  readonly manualDuration = signal<number | null>(null);

  readonly manualPhoneValid = computed(() => {
    const phone = toE164(this.manualPhone());
    return !phone || isValidE164(phone);
  });

  readonly manualCanSubmit = computed(
    () =>
      this.manualEmpresa().trim().length > 0 &&
      this.manualNit().trim().length > 0 &&
      this.manualContacto().trim().length > 0 &&
      this.manualPhoneValid(),
  );

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
    this.showManualForm.set(false);
  }

  openManualForm(): void {
    this.showManualForm.set(true);
    this.manualError.set(null);
    this.manualSuccess.set(null);
    this.selected.set(null);
  }

  closeManualForm(): void {
    this.showManualForm.set(false);
    this.resetManualForm();
  }

  submitManualCall(): void {
    if (!this.manualCanSubmit() || this.savingManual()) {
      return;
    }

    const phone = toE164(this.manualPhone());
    this.savingManual.set(true);
    this.manualError.set(null);
    this.manualSuccess.set(null);

    this.callsService
      .registerManual({
        customerName: this.manualContacto().trim(),
        phoneNumber: phone || undefined,
        variables: {
          empresa: this.manualEmpresa().trim(),
          nit: this.manualNit().trim(),
        },
        identidadVerificada: this.manualIdentidad(),
        clienteInteresado: this.manualInteresado(),
        motivoNoInteres: this.manualInteresado() ? undefined : this.manualMotivo().trim() || undefined,
        summary: this.manualSummary().trim() || undefined,
        durationSeconds: this.manualDuration() ?? undefined,
      })
      .subscribe({
        next: (call) => {
          this.savingManual.set(false);
          this.manualSuccess.set('Llamada manual registrada correctamente.');
          this.resetManualForm();
          this.showManualForm.set(false);
          this.calls.update((list) => [call, ...list.filter((item) => item.id !== call.id)]);
          this.selected.set(call);
        },
        error: () => {
          this.savingManual.set(false);
          this.manualError.set('No se pudo registrar la llamada manual. Revisa los datos e intenta de nuevo.');
        },
      });
  }

  recordingUrl(call: Call): string {
    return `${SALES_CALLS_API}/calls/${call.id}/recording`;
  }

  isManualCall(call: Call): boolean {
    return call.agentId === 'asesor-manual' || call.variables?.['canal'] === 'manual';
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

  private readonly HEADLINE_KEYS = ['identidad_verificada', 'cliente_interesado', 'motivo_no_interes'];

  identityVerified(call: Call): boolean | null {
    return this.truthiness(this.readVar(call, ['identidad_verificada', 'identidadVerificada']));
  }

  clientInterested(call: Call): boolean | null {
    return this.truthiness(this.readVar(call, ['cliente_interesado', 'clienteInteresado']));
  }

  noInterestReason(call: Call): string | null {
    return this.readVar(call, ['motivo_no_interes', 'motivo_no_interés', 'motivoNoInteres']) ?? null;
  }

  outputEntries(call: Call): { key: string; value: string }[] {
    if (!call.outputVariables) {
      return [];
    }
    return Object.entries(call.outputVariables)
      .filter(([key]) => !this.HEADLINE_KEYS.includes(key.toLowerCase()))
      .map(([key, value]) => ({ key, value: String(value) }));
  }

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

  private resetManualForm(): void {
    this.manualEmpresa.set('');
    this.manualNit.set('');
    this.manualContacto.set('');
    this.manualPhone.set('');
    this.manualIdentidad.set(false);
    this.manualInteresado.set(false);
    this.manualMotivo.set('');
    this.manualSummary.set('');
    this.manualDuration.set(null);
  }
}
