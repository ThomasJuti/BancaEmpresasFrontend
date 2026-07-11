import { Injectable, computed, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { getSupabaseBrowserClient } from '../../../core/services/supabase-client';

export interface OrusUser {
  name: string;
  email: string;
}

/**
 * Estado de autenticación de ORUS respaldado por Supabase Auth (Google OAuth).
 *
 * En producción (`environment.production === true`) usa OAuth con Google.
 * En local (`ng serve`) omite el redirect y crea una sesión de desarrollo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseBrowserClient();
  private readonly _user = signal<OrusUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  async initialize(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this._user.set(this.toOrusUser(data.session));

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._user.set(this.toOrusUser(session));
    });
  }

  /**
   * Inicia sesión. En producción redirige a Google vía Supabase; en local
   * resuelve de inmediato sin salir de localhost.
   */
  async loginWithGoogle(returnUrl = '/portafolio/pipeline'): Promise<void> {
    if (!environment.production) {
      this._user.set({ name: 'Usuario local', email: 'dev@local' });
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this._user.set(null);
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  private toOrusUser(session: Session | null): OrusUser | null {
    const user = session?.user;
    if (!user) {
      return null;
    }
    return {
      name: this.resolveName(user),
      email: user.email ?? '',
    };
  }

  private resolveName(user: User): string {
    const metadata = user.user_metadata ?? {};
    return (
      (metadata['full_name'] as string | undefined) ??
      (metadata['name'] as string | undefined) ??
      user.email ??
      'Usuario'
    );
  }
}
