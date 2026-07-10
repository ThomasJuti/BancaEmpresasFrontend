import { Routes } from '@angular/router';

export const PORTFOLIO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'pendientes',
    pathMatch: 'full',
  },
  {
    path: 'pendientes',
    loadComponent: () =>
      import('./components/portfolio-list-page/portfolio-list-page.component').then(
        (m) => m.PortfolioListPageComponent,
      ),
    data: { section: 'pending_calls' },
  },
  {
    path: 'pipeline',
    loadComponent: () =>
      import('./components/portfolio-list-page/portfolio-list-page.component').then(
        (m) => m.PortfolioListPageComponent,
      ),
    data: { section: 'pipeline' },
  },
  {
    path: ':companyId',
    loadComponent: () =>
      import('./components/company-pipeline-page/company-pipeline-page.component').then(
        (m) => m.CompanyPipelinePageComponent,
      ),
  },
];
