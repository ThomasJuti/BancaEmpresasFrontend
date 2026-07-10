import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PowerAppService } from '../../services/power-app.service';
import { PowerAppSubmissionStore } from '../../services/power-app-submission.store';
import {
  PowerAppSubmitResponse,
  PuntoEntrega,
  TipoIdentificacionTarjetahabiente,
  ValidationIssue,
} from '../../models/power-app-submit.model';
import { extractApiErrorMessage, humanizeRuesError } from '../../utils/extract-api-error.util';
import { buildPrefillFromCliente } from '../../utils/build-prefill.util';
import {
  createPdfPreviewSource,
  downloadPdfFromSource,
  PdfPreviewSource,
  revokePdfPreviewSource,
} from '../../utils/pdf-attachment.util';
import {
  POWER_APP_FIELD_TAB,
  hasBlockingValidationIssues,
  validatePowerAppClient,
} from '../../utils/power-app-client-validator';
import { PowerAppResultPanelComponent } from '../power-app-result-panel/power-app-result-panel.component';
import { RuesComparisonPanelComponent } from '../rues-comparison-panel/rues-comparison-panel.component';
import {
  RuesConsultarResponse,
  RuesFormSnapshot,
  RuesMetadata,
} from '../../models/rues-consultation.model';

type TabId = 'cliente' | 'tarjeta' | 'adjuntos' | 'entrega';

interface AttachmentItem {
  name: string;
  pdfBase64?: string | null;
  file?: File;
}

const ALLOWED_EXTENSION = 'pdf';

@Component({
  selector: 'app-power-app-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PowerAppResultPanelComponent, RuesComparisonPanelComponent],
  templateUrl: './power-app-form-modal.component.html',
  styleUrls: ['./power-app-form-modal.component.css'],
})
export class PowerAppFormModalComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly powerAppService = inject(PowerAppService);
  private readonly submissionStore = inject(PowerAppSubmissionStore);
  private readonly sanitizer = inject(DomSanitizer);

  @Input({ required: true }) companyNit!: string;
  @Input({ required: true }) companyName!: string;
  @Input({ required: true }) companyId!: string;
  @Input() open = false;
  @Input() readOnly = false;
  @Input() persistedSubmittedAt?: string;
  @Input() persistedRadicado?: string | null;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<PowerAppSubmitResponse>();

  readonly activeTab = signal<TabId>('cliente');
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly result = signal<PowerAppSubmitResponse | null>(null);
  readonly fieldIssues = signal<ValidationIssue[]>([]);
  readonly prefilledFields = signal<Set<string>>(new Set());
  readonly attachments = signal<AttachmentItem[]>([]);
  readonly dragOver = signal(false);
  readonly ruesEnabled = signal(false);
  readonly ruesConsulting = signal(false);
  readonly ruesError = signal<string | null>(null);
  readonly ruesResult = signal<RuesConsultarResponse | null>(null);
  readonly ruesMetadata = signal<RuesMetadata | null>(null);
  readonly manualPdfWarning = signal(false);
  readonly ruesWarningsAcknowledged = signal(false);
  readonly pdfPreviewOpen = signal(false);
  readonly pdfPreviewTitle = signal('');
  readonly pdfPreviewSafeUrl = signal<SafeResourceUrl | null>(null);
  private pdfPreviewSource: PdfPreviewSource | null = null;

  readonly docTypes: TipoIdentificacionTarjetahabiente[] = ['CC', 'CE', 'PA', 'TI'];
  readonly puntoEntregaOptions: { value: PuntoEntrega; label: string }[] = [
    { value: 'PUNTO_ENTREGA_A_COMERCIAL', label: 'Punto entrega a comercial' },
    { value: 'ENVIO_CERTIFICADO_COURIER', label: 'Envío certificado courier' },
  ];

  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'cliente', label: 'Cliente' },
    { id: 'tarjeta', label: 'Tarjeta' },
    { id: 'adjuntos', label: 'Documentos' },
    { id: 'entrega', label: 'Entrega' },
  ];

  readonly form = this.fb.nonNullable.group({
    leadId: [''],
    segmento: ['', Validators.required],
    tipoIdentificacionEmpresa: ['NIT' as const],
    tipoIdentificacionTarjetahabiente: ['CC' as TipoIdentificacionTarjetahabiente, Validators.required],
    numeroIdentificacionTarjetahabiente: ['', Validators.required],
    unidadNegocios: ['Banca Empresas', Validators.required],
    tipoTarjetaNueva: [{ value: 'LATAM BUSINESS', disabled: true }],
    identificacionEmpresa: ['', Validators.required],
    nombreEmpresa: ['', Validators.required],
    nombreTarjetahabiente: ['', Validators.required],
    binProducto: ['491250', Validators.required],
    cargoDebitoAutomatico: ['', Validators.required],
    cupoTarjetaNueva: [0, [Validators.required, Validators.min(1)]],
    cupoDisponibleCec: [0 as number | null],
    codigoOficinaCentroServicio: ['', Validators.required],
    ciudadPuntoEntrega: ['', Validators.required],
    direccionPuntoComercial: ['', Validators.required],
    puntoEntrega: ['PUNTO_ENTREGA_A_COMERCIAL' as PuntoEntrega, Validators.required],
  });

  ngOnChanges(): void {
    if (!this.open) {
      return;
    }

    const stored = this.submissionStore.get(this.companyId);
    if (this.readOnly && (this.persistedSubmittedAt || stored?.valid)) {
      this.result.set(stored ?? this.buildPersistedResult());
      this.loading.set(false);
      this.loadError.set(null);
      this.submitError.set(null);
      this.fieldIssues.set([]);
      return;
    }

    this.loadPrefill();
  }

  fieldMessage(field: string): string | null {
    const issue = this.fieldIssues().find((item) => item.field === field && item.severity === 'error');
    return issue?.message ?? null;
  }

  isPrefilled(field: string): boolean {
    return this.prefilledFields().has(field);
  }

  selectTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  close(): void {
    this.closePdfPreview();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('power-app-overlay')) {
      this.close();
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.addFiles(files);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    this.addFiles(files);
  }

  removeAttachment(name: string): void {
    this.closePdfPreview();
    this.attachments.update((list) => list.filter((item) => item.name !== name));
    if (this.attachments().length === 0 && !this.ruesMetadata()) {
      this.manualPdfWarning.set(false);
    }
  }

  hasRuesRepresentanteWarnings(): boolean {
    return (this.ruesResult()?.issues ?? []).some(
      (issue) => issue.code === 'RUES_REPRESENTANTE_NO_COINCIDE' && issue.severity === 'warning',
    );
  }

  consultarRues(): void {
    const raw = this.form.getRawValue();
    const nit = raw.identificacionEmpresa || this.companyNit;
    if (!nit?.trim()) {
      this.ruesError.set('Ingrese el NIT de la empresa antes de consultar RUES.');
      this.activeTab.set('cliente');
      return;
    }

    this.ruesError.set(null);
    this.ruesConsulting.set(true);
    this.manualPdfWarning.set(false);
    this.ruesWarningsAcknowledged.set(false);

    this.powerAppService
      .consultarRues(nit, this.buildRuesFormSnapshot(raw))
      .subscribe({
        next: (response) => {
          this.ruesConsulting.set(false);
          this.ruesResult.set(response);
          this.ruesMetadata.set({
            solicitudId: response.consultation.solicitudId,
            consultadoEn: response.consultation.consultadoEn,
            documentoOrigen: 'RUES',
            consultation: response.consultation,
          });
          this.attachments.set([
            { name: response.pdfFilename, pdfBase64: response.pdfBase64 },
          ]);
          this.mergeRuesIssues(response.issues);
        },
        error: (err: unknown) => {
          this.ruesConsulting.set(false);
          this.ruesError.set(
            humanizeRuesError(
              extractApiErrorMessage(
                err,
                'No se pudo consultar RUES. Intente de nuevo o cargue el PDF manualmente.',
              ),
            ),
          );
        },
      });
  }

  ruesNitLabel(): string {
    const raw = this.form.getRawValue();
    return (raw.identificacionEmpresa || this.companyNit || '').trim();
  }

  canPreviewAttachment(item: AttachmentItem): boolean {
    return Boolean(item.pdfBase64 || item.file);
  }

  previewAttachment(item: AttachmentItem): void {
    if (!this.canPreviewAttachment(item)) {
      return;
    }
    this.closePdfPreview();
    const source = createPdfPreviewSource(item);
    if (!source) {
      return;
    }
    this.pdfPreviewSource = source;
    this.pdfPreviewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(source.url));
    this.pdfPreviewTitle.set(item.name);
    this.pdfPreviewOpen.set(true);
  }

  downloadAttachment(item: AttachmentItem): void {
    if (!this.canPreviewAttachment(item)) {
      return;
    }
    downloadPdfFromSource(item, item.name);
  }

  downloadCurrentPreview(): void {
    const item = this.attachments().find((entry) => entry.name === this.pdfPreviewTitle());
    if (item) {
      this.downloadAttachment(item);
    }
  }

  closePdfPreview(): void {
    revokePdfPreviewSource(this.pdfPreviewSource);
    this.pdfPreviewSource = null;
    this.pdfPreviewSafeUrl.set(null);
    this.pdfPreviewOpen.set(false);
    this.pdfPreviewTitle.set('');
  }

  ngOnDestroy(): void {
    this.closePdfPreview();
  }

  onRuesWarningsAckChange(event: Event): void {
    this.ruesWarningsAcknowledged.set((event.target as HTMLInputElement).checked);
  }

  canRetrySubmission(): boolean {
    if (this.readOnly || this.persistedSubmittedAt) {
      return false;
    }
    const res = this.result();
    return !!res && (res.decision === 'RECHAZADO' || res.decision === 'DEVUELTO');
  }

  retryForm(): void {
    if (!this.canRetrySubmission()) {
      return;
    }

    const serverIssues = this.result()?.issues.filter((issue) => issue.severity === 'error') ?? [];
    this.result.set(null);
    this.submitError.set(null);
    this.fieldIssues.set(serverIssues);

    const firstError = serverIssues[0];
    if (firstError) {
      this.activeTab.set(POWER_APP_FIELD_TAB[firstError.field] ?? 'cliente');
    }
  }

  submit(): void {
    this.submitError.set(null);
    this.fieldIssues.set([]);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Complete los campos obligatorios en todas las pestañas.');
      return;
    }

    if (this.attachments().length === 0) {
      this.submitError.set('Debe adjuntar el certificado de Cámara de Comercio en PDF.');
      this.activeTab.set('adjuntos');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      tipoTarjetaNueva: 'LATAM BUSINESS',
      cupoTarjetaNueva: Number(raw.cupoTarjetaNueva),
      cupoDisponibleCec: raw.cupoDisponibleCec ? Number(raw.cupoDisponibleCec) : undefined,
      archivosAdjuntos: this.attachments().map((item) => item.name),
      leadId: raw.leadId || raw.identificacionEmpresa,
    };

    const clientIssues = [
      ...validatePowerAppClient(payload),
      ...(this.ruesResult()?.issues ?? []),
    ];

    if (this.manualPdfWarning() || this.ruesMetadata()?.documentoOrigen === 'MANUAL') {
      clientIssues.push({
        code: 'RUES_MANUAL_PDF_SIN_CONSULTA',
        field: 'archivosAdjuntos',
        message: 'Se adjuntó PDF manual sin consulta previa al RUES.',
        severity: 'warning',
        suggestion: 'Se recomienda consultar RUES para contrastar representantes legales.',
      });
    }

    this.fieldIssues.set(clientIssues);

    if (this.hasRuesRepresentanteWarnings() && !this.ruesWarningsAcknowledged()) {
      this.submitError.set('Confirme que revisó las advertencias de representante legal en RUES.');
      this.activeTab.set('adjuntos');
      return;
    }

    if (hasBlockingValidationIssues(clientIssues)) {
      const firstError = clientIssues.find((issue) => issue.severity === 'error');
      if (firstError) {
        this.activeTab.set(POWER_APP_FIELD_TAB[firstError.field] ?? 'cliente');
      }
      this.submitError.set(
        'Revise los campos marcados antes de enviar. La solicitud no se envió al servidor.',
      );
      return;
    }

    const ruesMeta = this.ruesMetadata();
    const submitPayload = {
      ...payload,
      ...(ruesMeta
        ? {
            ruesSolicitudId: ruesMeta.solicitudId,
            ruesConsultadoEn: ruesMeta.consultadoEn,
            documentoOrigen: ruesMeta.documentoOrigen,
            ruesConsultation: ruesMeta.consultation ?? undefined,
          }
        : {
            documentoOrigen: 'MANUAL' as const,
          }),
    };

    this.submitting.set(true);
    this.powerAppService.submit(submitPayload).subscribe({
      next: (res) => {
        this.result.set(res);
        this.submitting.set(false);
        if (res.valid) {
          this.submissionStore.save(this.companyId, res);
        }
        this.submitted.emit(res);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('No se pudo enviar la solicitud. Verifique la conexión con el backend.');
      },
    });
  }

  private addFiles(files: File[]): void {
    if (files.length === 0) return;

    const pdfFile = files.find((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      return ext === ALLOWED_EXTENSION;
    });

    if (!pdfFile) {
      this.submitError.set('Solo se permite un archivo PDF (certificado de Cámara de Comercio).');
      return;
    }

    this.submitError.set(null);
    this.attachments.set([{ name: pdfFile.name, file: pdfFile }]);
    this.ruesResult.set(null);
    this.ruesMetadata.set({
      solicitudId: '',
      consultadoEn: '',
      documentoOrigen: 'MANUAL',
      consultation: null,
    });
    this.manualPdfWarning.set(true);
    this.ruesWarningsAcknowledged.set(false);
  }

  private buildRuesFormSnapshot(raw: ReturnType<typeof this.form.getRawValue>): RuesFormSnapshot | undefined {
    const snapshot: RuesFormSnapshot = {
      identificacionEmpresa: raw.identificacionEmpresa?.trim() || undefined,
      nombreEmpresa: raw.nombreEmpresa?.trim() || undefined,
      numeroIdentificacionTarjetahabiente: raw.numeroIdentificacionTarjetahabiente?.trim() || undefined,
      nombreTarjetahabiente: raw.nombreTarjetahabiente?.trim() || undefined,
      ciudadPuntoEntrega: raw.ciudadPuntoEntrega?.trim() || undefined,
    };
    return Object.values(snapshot).some(Boolean) ? snapshot : undefined;
  }

  private mergeRuesIssues(issues: ValidationIssue[]): void {
    const merged = [...this.fieldIssues().filter((issue) => !issue.code.startsWith('RUES_')), ...issues];
    this.fieldIssues.set(merged);
  }

  private resetRuesState(): void {
    this.ruesConsulting.set(false);
    this.ruesError.set(null);
    this.ruesResult.set(null);
    this.ruesMetadata.set(null);
    this.manualPdfWarning.set(false);
    this.ruesWarningsAcknowledged.set(false);
  }

  private checkRuesAvailability(): void {
    this.powerAppService.ruesHealth().subscribe({
      next: (health) => this.ruesEnabled.set(health.enabled),
      error: () => this.ruesEnabled.set(false),
    });
  }

  private buildPersistedResult(): PowerAppSubmitResponse {
    return {
      decision: 'APROBADO',
      valid: true,
      radicado: this.persistedRadicado ?? null,
      issues: [],
      summary: 'Solicitud LATAM Business enviada y aprobada.',
      siguientePaso:
        'Operaciones procesará realce, fabricación y armado de carpeta. Operaciones entregará la carpeta al gerente de relaciones.',
      submittedAt: this.persistedSubmittedAt,
    };
  }

  private loadPrefill(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.result.set(null);
    this.fieldIssues.set([]);
    this.attachments.set([]);
    this.activeTab.set('cliente');
    this.resetRuesState();
    this.checkRuesAvailability();

    this.powerAppService.getClienteByNit(this.companyNit).subscribe({
      next: (cliente) => {
        const { value, prefilledFields } = buildPrefillFromCliente(cliente, this.companyNit, this.companyName);
        this.prefilledFields.set(prefilledFields);
        this.form.patchValue({
          ...value,
          tipoTarjetaNueva: 'LATAM BUSINESS',
        });
        if (!cliente) {
          this.loadError.set(
            'No se encontró la empresa en clientes finales. Puede diligenciar el formulario manualmente.',
          );
        }
        this.loading.set(false);
      },
      error: () => {
        const { value, prefilledFields } = buildPrefillFromCliente(null, this.companyNit, this.companyName);
        this.prefilledFields.set(prefilledFields);
        this.form.patchValue(value);
        this.loadError.set('No se pudo cargar la base de clientes. Puede diligenciar manualmente.');
        this.loading.set(false);
      },
    });
  }
}
