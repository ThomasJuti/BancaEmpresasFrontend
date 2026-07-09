import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PortfolioCompanySummary, PortfolioKpis } from '../../models/portfolio-company.model';
import { PortfolioRepository, PORTFOLIO_REPOSITORY } from '../../models/portfolio.repository';
import { activationStatusLabel } from '../../utils/follow-up.util';

@Component({
  selector: 'app-portfolio-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portfolio-list-page.component.html',
  styleUrls: ['./portfolio-list-page.component.css'],
})
export class PortfolioListPageComponent implements OnInit {
  private readonly repository = inject<PortfolioRepository>(PORTFOLIO_REPOSITORY);
  private readonly router = inject(Router);

  readonly companies = signal<PortfolioCompanySummary[]>([]);
  readonly kpis = signal<PortfolioKpis | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');

  readonly filteredCompanies = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return this.companies();
    }
    return this.companies().filter(
      (c) => c.name.toLowerCase().includes(q) || c.nit.toLowerCase().includes(q),
    );
  });

  statusLabel = activationStatusLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.repository.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el portafolio.');
        this.loading.set(false);
      },
    });

    this.repository.getKpis().subscribe({
      next: (kpis) => this.kpis.set(kpis),
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onSearchSubmit(): void {
    // filtrado reactivo vía computed
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
