import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PowerAppService } from '../../services/power-app.service';
import { PowerAppSubmissionStore } from '../../services/power-app-submission.store';
import {
  PowerAppSubmitResponse,
  PuntoEntrega,
  TipoIdentificacionTarjetahabiente,
  ValidationIssue,
} from '../../models/power-app-submit.model';
import { buildPrefillFromCliente } from '../../utils/build-prefill.util';
import {
  POWER_APP_FIELD_TAB,
  hasBlockingValidationIssues,
  validatePowerAppClient,
} from '../../utils/power-app-client-validator';
import { PowerAppResultPanelComponent } from '../power-app-result-panel/power-app-result-panel.component';

type TabId = 'cliente' | 'tarjeta' | 'adjuntos' | 'entrega';

interface AttachmentItem {
  name: string;
}

const ALLOWED_EXTENSION = 'pdf';

@Component({
  selector: 'app-power-app-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PowerAppResultPanelComponent],
  templateUrl: './power-app-form-modal.component.html',
  styleUrls: ['./power-app-form-modal.component.css'],
})
export class PowerAppFormModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly powerAppService = inject(PowerAppService);
  private readonly submissionStore = inject(PowerAppSubmissionStore);

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
    this.attachments.update((list) => list.filter((item) => item.name !== name));
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

    const clientIssues = validatePowerAppClient(payload);
    this.fieldIssues.set(clientIssues);

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

    this.submitting.set(true);
    this.powerAppService.submit(payload).subscribe({
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
    this.attachments.set([{ name: pdfFile.name }]);
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
