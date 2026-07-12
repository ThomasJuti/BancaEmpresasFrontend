import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './features/auth/services/auth.service';
import { PORTFOLIO_REPOSITORY } from './features/portfolio/models/portfolio.repository';
import { HttpPortfolioRepository } from './features/portfolio/services/http-portfolio.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    { provide: PORTFOLIO_REPOSITORY, useClass: HttpPortfolioRepository },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (auth: AuthService) => () => auth.initialize(),
      deps: [AuthService],
    },
  ],
};
