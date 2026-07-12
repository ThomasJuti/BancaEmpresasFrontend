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
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/portafolio/pipeline';
      await this.auth.loginWithGoogle(returnUrl);

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
