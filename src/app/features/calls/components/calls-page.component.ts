import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CallDetail, SalesCallsService } from '../../../core/services/sales-calls.service';
import {
  callDataEntries,
  callStatusLabel,
  clientInterested,
  endedReasonLabel,
  identityVerified,
  isCallSuccess,
  isManualCall,
  noInterestReason,
} from '../../../shared/utils/call-display.util';
import { isValidE164, toE164 } from '../../../shared/utils/phone.util';

@Component({
  selector: 'app-calls-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calls-page.component.html',
  styleUrls: ['./calls-page.component.css'],
})
export class CallsPageComponent implements OnInit {
  private readonly callsService = inject(SalesCallsService);

  readonly calls = signal<CallDetail[]>([]);
  readonly selected = signal<CallDetail | null>(null);
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

  readonly statusLabel = callStatusLabel;
  readonly isManualCall = isManualCall;
  readonly identityVerified = identityVerified;
  readonly clientInterested = clientInterested;
  readonly noInterestReason = noInterestReason;
  readonly isSuccess = isCallSuccess;
  readonly endedReasonLabel = endedReasonLabel;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.callsService.listCalls().subscribe({
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

  select(call: CallDetail): void {
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

  recordingUrl(call: CallDetail): string {
    return this.callsService.recordingUrl(call.id);
  }

  outputEntries(call: CallDetail): { key: string; label: string; value: string }[] {
    return callDataEntries(call.outputVariables, { excludeHeadlines: true });
  }

  structuredEntries(data?: Record<string, unknown>): { key: string; label: string; value: string }[] {
    return callDataEntries(data);
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
