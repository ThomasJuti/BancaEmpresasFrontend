import { Routes } from '@angular/router';

export const FOLLOW_UP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/follow-up-page/follow-up-page.component').then(
        (m) => m.FollowUpPageComponent,
      ),
  },
];
