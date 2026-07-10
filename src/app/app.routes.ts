import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/components/callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'portafolio/pendientes', pathMatch: 'full' },
      { path: 'llamadas', redirectTo: 'portafolio/pendientes', pathMatch: 'full' },
      {
        path: 'portafolio',
        loadChildren: () =>
          import('./features/portfolio/portfolio.routes').then((m) => m.PORTFOLIO_ROUTES),
      },
      {
        path: 'seguimiento',
        loadChildren: () =>
          import('./features/follow-up/follow-up.routes').then((m) => m.FOLLOW_UP_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
