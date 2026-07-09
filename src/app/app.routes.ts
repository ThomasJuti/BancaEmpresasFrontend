import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'portafolio', pathMatch: 'full' },
  {
    path: 'llamadas',
    loadComponent: () =>
      import('./features/calls/components/calls-page.component').then((m) => m.CallsPageComponent),
  },
  {
    path: 'portafolio',
    loadChildren: () => import('./features/portfolio/portfolio.routes').then((m) => m.PORTFOLIO_ROUTES),
  },
  { path: '**', redirectTo: 'portafolio' },
];
