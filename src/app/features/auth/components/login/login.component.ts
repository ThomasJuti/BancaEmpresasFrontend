import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/portafolio';
      // Inicia el redirect a Google. Si arranca bien, el navegador abandona esta
      // página, por lo que no hay navegación posterior que ejecutar aquí.
      await this.auth.loginWithGoogle(returnUrl);
    } catch {
      this.error.set('No se pudo iniciar sesión. Intenta de nuevo.');
      this.loading.set(false);
    }
  }
}
