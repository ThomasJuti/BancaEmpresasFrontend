import { Injectable, computed, signal } from '@angular/core';

export interface OrusUser {
  name: string;
  email: string;
}

// Solo un identificador de sesión ligero (nombre + correo del usuario).
// No se almacenan tokens ni datos financieros (minimización de datos). Se usa
// sessionStorage (no localStorage) para que la sesión no persista más de lo
// necesario: se limpia al cerrar la pestaña.
const SESSION_KEY = 'orus.session';

/**
 * Estado de autenticación de ORUS. El flujo con Google está simulado (mock)
 * mientras no exista backend de identidad; la interfaz está pensada para
 * sustituir `loginWithGoogle` por el SDK/redirect real sin tocar el resto.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<OrusUser | null>(this.restore());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  loginWithGoogle(): Promise<OrusUser> {
    const user: OrusUser = { name: 'Asesor Comercial', email: 'asesor@orus.com' };
    this._user.set(user);
    this.persist(user);
    return Promise.resolve(user);
  }

  logout(): void {
    this._user.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // sessionStorage no disponible; el estado en memoria ya se limpió.
    }
  }

  private persist(user: OrusUser): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // Persistencia best-effort; si falla, la sesión vive solo en memoria.
    }
  }

  private restore(): OrusUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as OrusUser) : null;
    } catch {
      return null;
    }
  }
}
