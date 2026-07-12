import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BatchLead, SalesCallsService } from '../../../../core/services/sales-calls.service';
import { isValidE164, toE164 } from '../../../../shared/utils/phone.util';
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  PipelineStage,
  PipelineStageId,
} from '../../models/pipeline-stage.model';
import { PortfolioCompanySummary } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import { PipelineStepperComponent } from '../pipeline-stepper/pipeline-stepper.component';

const PAGE_SIZE = 10;

type CallScope = 'single' | 'batch';

@Component({
  selector: 'app-portfolio-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PipelineStepperComponent],
  templateUrl: './portfolio-list-page.component.html',
  styleUrls: ['./portfolio-list-page.component.css'],
})
export class PortfolioListPageComponent implements OnInit {
  private readonly repository = inject<PortfolioRepository>(PORTFOLIO_REPOSITORY);
  private readonly salesCalls = inject(SalesCallsService);
  private readonly router = inject(Router);

  readonly companies = signal<PortfolioCompanySummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly page = signal(1);
  readonly total = signal(0);
  readonly stageFilter = signal<PipelineStageId | ''>('');

  readonly pageTitle = 'En gestión';
  readonly pageSubtitle =
    'Portafolio de empresas. Filtra por etapa, selecciona varias para una campaña de llamadas o abre el detalle de cada una.';

  readonly tableColumns = '0.4fr 2fr 1.2fr 1.4fr 0.8fr 1.6fr';

  readonly filterStages = computed<PipelineStage[]>(() => {
    const active = this.stageFilter();
    const activeIndex = active ? PIPELINE_STAGE_ORDER.indexOf(active) : -1;
    return PIPELINE_STAGE_ORDER.map((id, index) => ({
      id,
      order: index + 1,
      title: PIPELINE_STAGE_LABELS[id],
      status: activeIndex >= 0 && index < activeIndex ? 'completed' : 'pending',
      subSteps: [],
      actions: [],
    }));
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * PAGE_SIZE + 1));
  readonly rangeEnd = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));
  readonly canGoPrev = computed(() => this.page() > 1);
  readonly canGoNext = computed(() => this.page() < this.totalPages());
  readonly pageItems = computed(() => buildPageItems(this.totalPages(), this.page()));

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly showCallModal = signal(false);
  readonly callScope = signal<CallScope>('single');
  readonly callTarget = signal<PortfolioCompanySummary | null>(null);
  readonly editablePhone = signal('');
  readonly calling = signal(false);
  readonly feedback = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly allVisibleSelected = computed(() => {
    const visible = this.companies();
    if (visible.length === 0) {
      return false;
    }
    const selected = this.selectedIds();
    return visible.every((c) => selected.has(c.id));
  });

  readonly callableSelected = computed(() =>
    this.companies().filter((c) => this.selectedIds().has(c.id) && this.hasPhone(c)),
  );

  readonly editablePhoneValid = computed(() => isValidE164(toE164(this.editablePhone())));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.selectedIds.set(new Set());

    this.repository
      .getCompanies({
        page: this.page(),
        pageSize: PAGE_SIZE,
        search: this.searchQuery().trim() || undefined,
        stage: this.stageFilter() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.companies.set(result.companies);
          this.total.set(result.total);
          this.page.set(result.page);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el portafolio.');
          this.loading.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onSearchSubmit(): void {
    this.page.set(1);
    this.load();
  }

  onStageFilterChange(stage: PipelineStageId | ''): void {
    this.stageFilter.set(stage);
    this.page.set(1);
    this.load();
  }

  isStageFilterActive(stage: PipelineStageId | ''): boolean {
    return this.stageFilter() === stage;
  }

  goToPrevPage(): void {
    if (!this.canGoPrev()) return;
    this.page.update((current) => current - 1);
    this.load();
  }

  goToNextPage(): void {
    if (!this.canGoNext()) return;
    this.page.update((current) => current + 1);
    this.load();
  }

  goToPage(targetPage: number): void {
    if (
      targetPage < 1 ||
      targetPage > this.totalPages() ||
      targetPage === this.page() ||
      this.loading()
    ) {
      return;
    }
    this.page.set(targetPage);
    this.load();
  }

  openCompany(company: PortfolioCompanySummary): void {
    void this.router.navigate(['/portafolio', company.id]);
  }

  isSelected(company: PortfolioCompanySummary): boolean {
    return this.selectedIds().has(company.id);
  }

  toggleSelect(company: PortfolioCompanySummary): void {
    const next = new Set(this.selectedIds());
    if (next.has(company.id)) {
      next.delete(company.id);
    } else {
      next.add(company.id);
    }
    this.selectedIds.set(next);
  }

  toggleSelectAll(): void {
    if (this.allVisibleSelected()) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.companies().map((c) => c.id)));
  }

  openSingleCall(company: PortfolioCompanySummary, event?: Event): void {
    event?.stopPropagation();
    this.callScope.set('single');
    this.callTarget.set(company);
    this.editablePhone.set(toE164(company.phone) ?? company.phone ?? '');
    this.showCallModal.set(true);
  }

  openBatchCall(): void {
    if (this.callableSelected().length === 0) {
      return;
    }
    this.callScope.set('batch');
    this.callTarget.set(null);
    this.showCallModal.set(true);
  }

  closeCallModal(): void {
    if (this.calling()) {
      return;
    }
    this.showCallModal.set(false);
    this.callTarget.set(null);
    this.editablePhone.set('');
  }

  confirmCall(): void {
    if (this.callScope() === 'single') {
      this.confirmSingleCall();
    } else {
      this.confirmBatchCall();
    }
  }

  hasPhone(company: PortfolioCompanySummary): boolean {
    return !!toE164(company.phone);
  }

  private confirmSingleCall(): void {
    const company = this.callTarget();
    const phone = toE164(this.editablePhone());
    if (!company || !phone || !this.editablePhoneValid()) {
      return;
    }

    this.calling.set(true);
    this.salesCalls
      .initiateCall({
        phoneNumber: phone,
        customerName: company.representanteLegalNombre ?? company.name,
        customerEmail: company.email ?? undefined,
        variables: this.callContext(company),
      })
      .subscribe({
        next: (call) => {
          this.calling.set(false);
          this.showCallModal.set(false);
          this.showFeedback(`Contacto encolado para ${company.name} (estado: ${call.status}).`);
        },
        error: () => {
          this.calling.set(false);
          this.showFeedback('No se pudo iniciar el contacto. Intenta de nuevo.');
        },
      });
  }

  private confirmBatchCall(): void {
    const targets = this.callableSelected();
    if (targets.length === 0) {
      return;
    }

    const leads: BatchLead[] = targets.map((company) => ({
      leadId: company.id,
      phoneNumber: toE164(company.phone) as string,
      customerName: company.representanteLegalNombre ?? company.name,
      customerEmail: company.email ?? undefined,
      variables: this.callContext(company),
    }));

    const name = `Campaña por llamar ${new Date().toLocaleString('es-CO')}`;

    this.calling.set(true);
    this.salesCalls.createBatch({ name, leads }).subscribe({
      next: (batch) => {
        this.calling.set(false);
        this.showCallModal.set(false);
        this.selectedIds.set(new Set());
        this.showFeedback(
          `Campaña creada con ${leads.length} contacto(s) (estado: ${batch.status}).`,
        );
      },
      error: () => {
        this.calling.set(false);
        this.showFeedback('No se pudo crear la campaña. Intenta de nuevo.');
      },
    });
  }

  private callContext(company: PortfolioCompanySummary): Record<string, string> {
    const context: Record<string, string> = {
      empresa: company.name,
      nit: company.nit,
    };
    if (company.representanteLegalNombre?.trim()) {
      context['nombre'] = company.representanteLegalNombre.trim();
    }
    return context;
  }

  private showFeedback(message: string): void {
    this.feedback.set(message);
    setTimeout(() => this.feedback.set(null), 4000);
  }
}

type PageItem = { kind: 'page'; page: number } | { kind: 'gap' };

function buildPageItems(totalPages: number, currentPage: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({ kind: 'page', page: index + 1 }));
  }

  const items: PageItem[] = [{ kind: 'page', page: 1 }];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push({ kind: 'gap' });
  }

  for (let page = start; page <= end; page += 1) {
    items.push({ kind: 'page', page });
  }

  if (end < totalPages - 1) {
    items.push({ kind: 'gap' });
  }

  items.push({ kind: 'page', page: totalPages });
  return items;
}
