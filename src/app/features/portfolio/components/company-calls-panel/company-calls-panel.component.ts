import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CallDetail, SalesCallsService } from '../../../../core/services/sales-calls.service';
import {
  callContactSubtitle,
  callContactTitle,
  callDataEntries,
  callOriginLabel,
  callStatusLabel,
  clientInterested,
  endedReasonLabel,
  identityVerified,
  isCallProcessing,
  isCallSuccess,
  isCallTerminal,
  isManualCall,
  manualNotesPreview,
  noInterestReason,
} from '../../../../shared/utils/call-display.util';
import { isValidE164, toE164 } from '../../../../shared/utils/phone.util';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';

export interface CallsChangedEvent {
  pending?: boolean;
  terminal?: boolean;
  callId?: string;
}

type ContactMode = 'idle' | 'auto' | 'manual' | 'tracking';

const POLL_MS_CONTACT = 5000;
const POLL_MS_HISTORY = 8000;

@Component({
  selector: 'app-company-calls-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-calls-panel.component.html',
  styleUrls: ['./company-calls-panel.component.css'],
})
export class CompanyCallsPanelComponent implements OnInit, OnChanges, OnDestroy {
  private readonly repository = inject<PortfolioRepository>(PORTFOLIO_REPOSITORY);
  private readonly salesCalls = inject(SalesCallsService);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  @Input({ required: true }) companyId!: string;
  @Input({ required: true }) companyName!: string;
  @Input({ required: true }) companyNit!: string;
  @Input() phone: string | null = null;
  @Input() email: string | null = null;
  @Input() representanteLegalNombre: string | null = null;
  @Input() pipelineCaseId: string | null = null;
  @Input() section: 'contact' | 'history' = 'contact';
  @Input() embedded = false;
  @Input() focusAction: 'auto' | 'manual' | null = null;
  @Input() selectedCallId: string | null = null;
  @Input() refreshKey = 0;
  @Input() autoOnly = false;

  @Output() callsChanged = new EventEmitter<CallsChangedEvent | void>();
  @Output() goToContact = new EventEmitter<void>();
  @Output() openRecording = new EventEmitter<void>();

  readonly calls = signal<CallDetail[]>([]);
  readonly selected = signal<CallDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly contactMode = signal<ContactMode>('idle');
  readonly acting = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);

  readonly activeCallId = signal<string | null>(null);
  readonly trackingCall = signal<CallDetail | null>(null);

  readonly editablePhone = signal('');
  readonly manualContacto = signal('');
  readonly manualIdentidad = signal(false);
  readonly manualInteresado = signal(false);
  readonly manualMotivo = signal('');
  readonly manualSummary = signal('');
  readonly manualDuration = signal<number | null>(null);

  readonly hasPhone = computed(() => !!toE164(this.phone));
  readonly editablePhoneValid = computed(() => isValidE164(toE164(this.editablePhone())));
  readonly manualPhoneValid = computed(() => {
    const phone = toE164(this.editablePhone());
    return !phone || isValidE164(phone);
  });
  readonly manualCanSubmit = computed(
    () => this.manualContacto().trim().length > 0 && this.manualPhoneValid(),
  );
  readonly embeddedHistory = computed(() => this.embedded && this.section === 'history');
  readonly showCallPicker = computed(() => this.embeddedHistory() && this.calls().length > 1);
  readonly isTracking = computed(
    () => this.section === 'contact' && this.contactMode() === 'tracking' && !!this.trackingCall(),
  );

  readonly statusLabel = callStatusLabel;
  readonly originLabel = callOriginLabel;
  readonly endedLabel = endedReasonLabel;
  readonly isManual = isManualCall;
  readonly isSuccess = isCallSuccess;
  readonly identityVerified = identityVerified;
  readonly clientInterested = clientInterested;
  readonly noInterestReason = noInterestReason;
  readonly contactTitle = callContactTitle;
  readonly contactSubtitle = callContactSubtitle;
  readonly manualNotesPreview = manualNotesPreview;
  readonly isCallProcessing = isCallProcessing;
  readonly recordingUrl = (call: CallDetail) => this.salesCalls.recordingUrl(call.id);

  ngOnInit(): void {
    if (this.section === 'history') {
      this.load();
    } else {
      this.applyFocusAction();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['focusAction'] && this.section === 'contact') {
      this.applyFocusAction();
    }
    if ((changes['selectedCallId'] || changes['refreshKey']) && this.section === 'history') {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.getCallsForCompany(this.companyNit).subscribe({
      next: (calls) => {
        this.calls.set(calls);
        const preferred =
          (this.selectedCallId && calls.find((c) => c.id === this.selectedCallId)) ||
          calls[0] ||
          null;
        if (preferred) {
          this.hydrateCallDetail(preferred);
        } else {
          this.selected.set(null);
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('No se pudo cargar el historial de contacto.');
        this.loading.set(false);
      },
    });
  }

  select(call: CallDetail): void {
    this.selected.set(call);
    this.clearActionFeedback();
    this.hydrateCallDetail(call);
  }

  chooseAuto(): void {
    this.openAutoForm();
  }

  chooseManual(): void {
    this.openManualForm();
  }

  openAutoForm(): void {
    this.contactMode.set('auto');
    this.editablePhone.set(toE164(this.phone) ?? this.phone ?? '');
    this.clearActionFeedback();
  }

  openManualForm(): void {
    this.contactMode.set('manual');
    this.editablePhone.set(toE164(this.phone) ?? this.phone ?? '');
    this.manualContacto.set(this.representanteLegalNombre ?? this.companyName);
    this.manualIdentidad.set(false);
    this.manualInteresado.set(false);
    this.manualMotivo.set('');
    this.manualSummary.set('');
    this.manualDuration.set(null);
    this.clearActionFeedback();
  }

  backToToolbar(): void {
    this.contactMode.set('idle');
    this.activeCallId.set(null);
    this.trackingCall.set(null);
    this.stopPolling();
    this.clearActionFeedback();
  }

  confirmAutoCall(): void {
    const phone = toE164(this.editablePhone());
    if (!phone || !this.editablePhoneValid() || this.acting()) {
      return;
    }

    this.acting.set(true);
    this.actionError.set(null);
    this.salesCalls
      .initiateCall({
        phoneNumber: phone,
        customerName: this.representanteLegalNombre ?? this.companyName,
        customerEmail: this.email ?? undefined,
        variables: this.callContext(),
        caseId: this.pipelineCaseId ?? undefined,
      })
      .subscribe({
        next: (initiated) => {
          this.acting.set(false);
          this.activeCallId.set(initiated.id);
          this.contactMode.set('tracking');
          this.actionSuccess.set(null);
          this.hydrateTrackingCall(initiated.id, { notifyPending: true });
        },
        error: () => {
          this.acting.set(false);
          this.actionError.set('No se pudo iniciar el contacto automático.');
        },
      });
  }

  submitManualCall(): void {
    if (!this.manualCanSubmit() || this.acting()) {
      return;
    }

    const phone = toE164(this.editablePhone());
    this.acting.set(true);
    this.actionError.set(null);

    this.salesCalls
      .registerManual({
        customerName: this.manualContacto().trim(),
        phoneNumber: phone || undefined,
        customerEmail: this.email ?? undefined,
        variables: {
          empresa: this.companyName,
          nit: this.companyNit,
        },
        identidadVerificada: this.manualIdentidad(),
        clienteInteresado: this.manualInteresado(),
        motivoNoInteres: this.manualInteresado() ? undefined : this.manualMotivo().trim() || undefined,
        summary: this.manualSummary().trim() || undefined,
        durationSeconds: this.manualDuration() ?? undefined,
      })
      .subscribe({
        next: (call) => {
          this.acting.set(false);
          this.contactMode.set('idle');
          this.actionSuccess.set('Contacto registrado. Ver en Grabación asociada.');
          this.callsChanged.emit({ terminal: true, callId: call.id });
        },
        error: () => {
          this.acting.set(false);
          this.actionError.set('No se pudo registrar el contacto manual.');
        },
      });
  }

  viewRecordingHistory(): void {
    this.openRecording.emit();
  }

  trackingBannerMessage(call: CallDetail): string {
    if (call.status === 'queued') {
      return 'Contacto en cola. El agente llamará en breve.';
    }
    if (call.status === 'initiated' || call.status === 'in_progress') {
      return 'Llamada en curso con el representante.';
    }
    if (isCallProcessing(call)) {
      return 'Procesando información de la llamada…';
    }
    if (call.status === 'failed') {
      return 'No se completó el contacto automático.';
    }
    return 'Llamada finalizada.';
  }

  trackingBannerVariant(call: CallDetail): 'info' | 'processing' | 'warning' {
    if (call.status === 'failed') {
      return 'warning';
    }
    if (isCallProcessing(call)) {
      return 'processing';
    }
    return 'info';
  }

  showTrackingActions(call: CallDetail): boolean {
    return this.isPendingCall(call) || isCallProcessing(call);
  }

  outputEntries(call: CallDetail): { label: string; value: string }[] {
    return callDataEntries(call.outputVariables, { excludeHeadlines: true });
  }

  analysisEntries(call: CallDetail): { label: string; value: string }[] {
    return callDataEntries(call.structuredData, { excludeHeadlines: true });
  }

  transcriptRole(role: string): string {
    if (role === 'user') return 'Cliente';
    if (role === 'bot' || role === 'agent') return 'Asistente';
    return role;
  }

  isPendingCall(call: CallDetail): boolean {
    return call.status === 'queued' || call.status === 'initiated' || call.status === 'in_progress';
  }

  pendingCallMessage(call: CallDetail): string {
    if (call.status === 'queued') {
      return 'El contacto automático está en cola. La grabación y el detalle aparecerán cuando finalice.';
    }
    if (call.status === 'initiated' || call.status === 'in_progress') {
      return 'Contacto en curso. Actualiza en unos momentos para ver el resultado y la grabación.';
    }
    if (isCallProcessing(call)) {
      return 'Procesando información de la llamada. El detalle se actualizará en breve.';
    }
    return '';
  }

  hasCallMetrics(call: CallDetail): boolean {
    if (isManualCall(call)) {
      return true;
    }
    return (
      call.durationSeconds != null ||
      call.successEvaluation !== undefined ||
      !!call.endedReason
    );
  }

  qualificationLabel(call: CallDetail): string {
    if (call.successEvaluation === undefined) {
      return '—';
    }
    return isCallSuccess(call.successEvaluation) ? 'Calificado' : 'No calificado';
  }

  hasRecordingAvailable(call: CallDetail): boolean {
    if (isManualCall(call)) {
      return false;
    }
    if (call.recordingUrl) {
      return true;
    }
    return call.status === 'completed' || call.status === 'failed';
  }

  private hydrateCallDetail(summary: CallDetail, options?: { silent?: boolean }): void {
    if (!options?.silent) {
      this.loading.set(true);
    }
    this.salesCalls.getCall(summary.id).subscribe({
      next: (detail) => {
        const previous = this.selected();
        this.selected.set(detail);
        this.calls.update((list) => list.map((c) => (c.id === detail.id ? detail : c)));
        this.loading.set(false);

        if (
          this.section === 'history' &&
          previous &&
          (this.isPendingCall(previous) || isCallProcessing(previous)) &&
          isCallTerminal(detail) &&
          !isCallProcessing(detail)
        ) {
          this.callsChanged.emit({ terminal: true, callId: detail.id });
        }

        this.syncPollingForCall(detail);
      },
      error: () => {
        this.selected.set(summary);
        this.loading.set(false);
        this.syncPollingForCall(summary);
      },
    });
  }

  private hydrateTrackingCall(
    callId: string,
    options?: { notifyPending?: boolean; silent?: boolean },
  ): void {
    this.salesCalls.getCall(callId).subscribe({
      next: (detail) => {
        const previous = this.trackingCall();
        this.trackingCall.set(detail);

        if (options?.notifyPending) {
          this.callsChanged.emit({ pending: true, callId: detail.id });
        }

        if (this.isActiveTrackingTarget(detail)) {
          this.syncPollingForCall(detail);
          return;
        }

        if (isCallTerminal(detail) && !isCallProcessing(detail)) {
          this.finishTracking(detail, previous);
        }
      },
      error: () => {
        if (!options?.silent) {
          this.actionError.set('No se pudo consultar el estado del contacto automático.');
        }
      },
    });
  }

  private finishTracking(detail: CallDetail, previous: CallDetail | null): void {
    const wasActive =
      !!previous &&
      (this.isPendingCall(previous) || isCallProcessing(previous) || previous.status !== detail.status);

    this.contactMode.set('idle');
    this.activeCallId.set(null);
    this.trackingCall.set(null);
    this.stopPolling();

    if (wasActive || previous?.id === detail.id) {
      this.callsChanged.emit({ terminal: true, callId: detail.id });
    }
  }

  private isActiveTrackingTarget(call: CallDetail): boolean {
    if (this.section === 'contact' && this.contactMode() === 'tracking') {
      return this.isPendingCall(call) || isCallProcessing(call);
    }
    if (this.section === 'history') {
      return this.isPendingCall(call) || isCallProcessing(call);
    }
    return false;
  }

  private syncPollingForCall(call: CallDetail): void {
    if (this.isActiveTrackingTarget(call)) {
      this.startPolling(call.id);
    } else {
      this.stopPolling();
    }
  }

  private startPolling(callId: string): void {
    this.stopPolling();
    const interval = this.section === 'contact' ? POLL_MS_CONTACT : POLL_MS_HISTORY;

    this.pollTimer = setInterval(() => {
      if (this.section === 'contact' && this.contactMode() === 'tracking') {
        this.hydrateTrackingCall(callId, { silent: true });
        return;
      }

      const current = this.selected();
      if (!current || current.id !== callId) {
        this.stopPolling();
        return;
      }

      if (!this.isActiveTrackingTarget(current)) {
        this.stopPolling();
        return;
      }

      this.hydrateCallDetail(current, { silent: true });
    }, interval);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private applyFocusAction(): void {
    if (this.focusAction === 'auto') {
      this.openAutoForm();
    } else if (this.focusAction === 'manual') {
      this.openManualForm();
    }
  }

  private callContext(): Record<string, string> {
    const context: Record<string, string> = {
      empresa: this.companyName,
      nit: this.companyNit,
    };
    if (this.representanteLegalNombre?.trim()) {
      context['nombre'] = this.representanteLegalNombre.trim();
    }
    return context;
  }

  private clearActionFeedback(): void {
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }
}
