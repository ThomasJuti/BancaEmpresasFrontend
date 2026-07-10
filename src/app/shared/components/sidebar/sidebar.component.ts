import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

interface NavItem {
  label: string;
  icon: 'phone' | 'portfolio' | 'box' | 'star' | 'chart';
  route?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly items: NavItem[] = [
    { label: 'Llamadas', icon: 'phone', route: '/llamadas' },
    { label: 'Portafolio', icon: 'portfolio', route: '/portafolio' },
    { label: 'Entregas', icon: 'box' },
    { label: 'Seguimiento', icon: 'star' },
    { label: 'Reportes', icon: 'chart' },
  ];

  async logout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
