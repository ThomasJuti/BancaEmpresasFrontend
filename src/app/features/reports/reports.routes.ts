import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/reports-page/reports-page.component').then(
        (m) => m.ReportsPageComponent,
      ),
  },
];
