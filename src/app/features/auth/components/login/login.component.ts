import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly appVersion = '1.1.1';

  async continueWithGoogle(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/portafolio/pendientes';
      await this.auth.loginWithGoogle(returnUrl);

      // En local la sesión se crea sin redirect; en producción el navegador sale hacia Google.
      if (this.auth.isAuthenticated()) {
        void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
        return;
      }
    } catch {
      this.error.set('No se pudo iniciar sesión. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
