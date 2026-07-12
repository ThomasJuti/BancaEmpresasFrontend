import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

type NavIcon = 'portfolio' | 'box' | 'star' | 'chart';

interface NavItem {
  label: string;
  icon: NavIcon;
  route: string;
  exact?: boolean;
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
    { label: 'En gestión', icon: 'portfolio', route: '/portafolio/pipeline', exact: true },
    { label: 'Entregas', icon: 'box', route: '' },
    { label: 'Seguimiento', icon: 'star', route: '/seguimiento' },
    { label: 'Reportes', icon: 'chart', route: '' },
  ];

  async logout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
