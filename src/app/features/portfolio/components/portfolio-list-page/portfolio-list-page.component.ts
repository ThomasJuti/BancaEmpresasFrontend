import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesCallsService, BatchLead } from '../../../../core/services/sales-calls.service';
import { isValidE164, toE164 } from '../../../../shared/utils/phone.util';
import { PortfolioCompanySummary, PortfolioKpis } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import { activationStatusLabel } from '../../utils/follow-up.util';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

type CallScope = 'single' | 'batch';

@Component({
  selector: 'app-portfolio-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './portfolio-list-page.component.html',
  styleUrls: ['./portfolio-list-page.component.css'],
})
export class PortfolioListPageComponent implements OnInit, OnDestroy {
  private readonly repository = inject<PortfolioRepository>(PORTFOLIO_REPOSITORY);
  private readonly salesCalls = inject(SalesCallsService);
  private readonly router = inject(Router);

  readonly pageSize = PAGE_SIZE;
  readonly companies = signal<PortfolioCompanySummary[]>([]);
  readonly kpis = signal<PortfolioKpis | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly page = signal(1);
  readonly total = signal(0);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * PAGE_SIZE + 1));
  readonly rangeEnd = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));
  readonly canGoPrev = computed(() => this.page() > 1);
  readonly canGoNext = computed(() => this.page() < this.totalPages());
  readonly pageItems = computed(() => buildPageItems(this.totalPages(), this.page()));

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectedIds = signal<Set<string>>(new Set());

  // Estado del modal de confirmación (human-in-the-loop).
  readonly showCallModal = signal(false);
  readonly callScope = signal<CallScope>('single');
  readonly callTarget = signal<PortfolioCompanySummary | null>(null);
  readonly editablePhone = signal('');
  readonly calling = signal(false);
  readonly feedback = signal<string | null>(null);

  statusLabel = activationStatusLabel;

  // La búsqueda y la paginación se resuelven en el servidor; aquí se expone la
  // página actual para la selección múltiple.
  readonly filteredCompanies = computed(() => this.companies());

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly allVisibleSelected = computed(() => {
    const visible = this.filteredCompanies();
    if (visible.length === 0) {
      return false;
    }
    const selected = this.selectedIds();
    return visible.every((c) => selected.has(c.id));
  });

  // Empresas seleccionadas que tienen teléfono válido para llamar.
  readonly callableSelected = computed(() =>
    this.companies().filter((c) => this.selectedIds().has(c.id) && !!toE164(c.phone)),
  );

  readonly editablePhoneValid = computed(() => isValidE164(toE164(this.editablePhone())));

  ngOnInit(): void {
    this.loadKpis();
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
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

  private loadKpis(): void {
    this.repository.getKpis().subscribe({
      next: (kpis) => this.kpis.set(kpis),
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, SEARCH_DEBOUNCE_MS);
  }

  onSearchSubmit(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.page.set(1);
    this.load();
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

  badgeStatus(status: string): string {
    if (status === 'activated') return 'activated';
    if (status === 'at_risk') return 'at_risk';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
  }

  hasPhone(company: PortfolioCompanySummary): boolean {
    return !!toE164(company.phone);
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
    this.selectedIds.set(new Set(this.filteredCompanies().map((c) => c.id)));
  }

  // --- Llamadas (human-in-the-loop) ---

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

  private confirmSingleCall(): void {
    const company = this.callTarget();
    const phone = toE164(this.editablePhone());
    if (!company || !phone) {
      return;
    }

    this.calling.set(true);
    this.salesCalls
      .initiateCall({
        phoneNumber: phone,
        customerName: company.name,
        customerEmail: company.email ?? undefined,
      })
      .subscribe({
        next: (call) => {
          this.calling.set(false);
          this.showCallModal.set(false);
          this.showFeedback(`Llamada encolada para ${company.name} (estado: ${call.status}).`);
        },
        error: () => {
          this.calling.set(false);
          this.showFeedback('No se pudo iniciar la llamada. Intenta de nuevo.');
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
      customerName: company.name,
      customerEmail: company.email ?? undefined,
    }));

    const name = `Campaña portafolio ${new Date().toLocaleString('es-CO')}`;

    this.calling.set(true);
    this.salesCalls.createBatch({ name, leads }).subscribe({
      next: (batch) => {
        this.calling.set(false);
        this.showCallModal.set(false);
        this.selectedIds.set(new Set());
        this.showFeedback(
          `Campaña creada con ${leads.length} llamada(s) (estado: ${batch.status}).`,
        );
      },
      error: () => {
        this.calling.set(false);
        this.showFeedback('No se pudo crear la campaña. Intenta de nuevo.');
      },
    });
  }

  goToCalls(): void {
    void this.router.navigate(['/llamadas']);
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
