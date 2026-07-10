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
      { path: '', redirectTo: 'portafolio', pathMatch: 'full' },
      {
        path: 'llamadas',
        loadComponent: () =>
          import('./features/calls/components/calls-page.component').then(
            (m) => m.CallsPageComponent,
          ),
      },
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
