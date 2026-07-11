import { Routes } from '@angular/router';

export const PORTFOLIO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'pipeline',
    pathMatch: 'full',
  },
  {
    path: 'pipeline',
    loadComponent: () =>
      import('./components/portfolio-list-page/portfolio-list-page.component').then(
        (m) => m.PortfolioListPageComponent,
      ),
  },
  {
    path: ':companyId',
    loadComponent: () =>
      import('./components/company-pipeline-page/company-pipeline-page.component').then(
        (m) => m.CompanyPipelinePageComponent,
      ),
  },
];
