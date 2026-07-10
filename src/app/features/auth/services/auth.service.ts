import { Injectable, computed, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../../core/services/supabase-client';

export interface OrusUser {
  name: string;
  email: string;
}

/**
 * Estado de autenticación de ORUS respaldado por Supabase Auth (Google OAuth).
 *
 * El flujo es:
 *  1. `loginWithGoogle()` inicia el redirect a Google vía Supabase.
 *  2. Google redirige de vuelta a la app; supabase-js detecta la sesión en la
 *     URL (PKCE) y la persiste en sessionStorage.
 *  3. `initialize()` (invocado por APP_INITIALIZER) restaura la sesión antes de
 *     que corran los guards, y `onAuthStateChange` mantiene el estado en vivo.
 *
 * No se almacenan datos financieros ni tokens fuera del propio SDK; solo se
 * expone un identificador ligero (nombre + correo) para la UI. La autorización
 * real la impone el backend verificando el JWT emitido por Supabase.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseBrowserClient();
  private readonly _user = signal<OrusUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /**
   * Restaura la sesión existente y se suscribe a los cambios de auth. Debe
   * resolverse antes de que se evalúen los guards de rutas.
   */
  async initialize(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this._user.set(this.toOrusUser(data.session));

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._user.set(this.toOrusUser(session));
    });
  }

  /**
   * Inicia sesión con Google. Provoca una redirección de página completa hacia
   * Google, por lo que esta promesa normalmente no resuelve en la misma carga;
   * solo rechaza si falla el arranque del flujo OAuth.
   */
  async loginWithGoogle(returnUrl = '/portafolio'): Promise<void> {
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

  /** Devuelve el access token JWT actual para autenticar llamadas al backend. */
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
