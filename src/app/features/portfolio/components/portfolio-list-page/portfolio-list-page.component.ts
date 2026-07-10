import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PortfolioCompanySummary, PortfolioKpis } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import { activationStatusLabel } from '../../utils/follow-up.util';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-portfolio-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portfolio-list-page.component.html',
  styleUrls: ['./portfolio-list-page.component.css'],
})
export class PortfolioListPageComponent implements OnInit, OnDestroy {
  private readonly repository = inject<PortfolioRepository>(PORTFOLIO_REPOSITORY);
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

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  statusLabel = activationStatusLabel;

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

  openCompany(company: PortfolioCompanySummary): void {
    void this.router.navigate(['/portafolio', company.id]);
  }

  badgeStatus(status: string): string {
    if (status === 'activated') return 'activated';
    if (status === 'at_risk') return 'at_risk';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
  }
}
