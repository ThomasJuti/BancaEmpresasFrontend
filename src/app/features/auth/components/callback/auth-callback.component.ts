import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<p class="auth-callback">Completando el inicio de sesión…</p>`,
  styles: [
    `.auth-callback {
      display: grid;
      place-items: center;
      min-height: 100vh;
      margin: 0;
      color: #64748b;
      font-family: system-ui, sans-serif;
    }`,
  ],
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/portafolio/pipeline';
    const target = this.auth.isAuthenticated() ? returnUrl : '/login';
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
