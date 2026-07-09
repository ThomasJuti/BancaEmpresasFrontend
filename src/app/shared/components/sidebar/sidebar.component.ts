import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  readonly items: NavItem[] = [
    { label: 'Llamadas', icon: 'phone', route: '/llamadas' },
    { label: 'Portafolio', icon: 'portfolio', route: '/portafolio' },
    { label: 'Entregas', icon: 'box' },
    { label: 'Seguimiento', icon: 'star' },
    { label: 'Reportes', icon: 'chart' },
  ];
}
