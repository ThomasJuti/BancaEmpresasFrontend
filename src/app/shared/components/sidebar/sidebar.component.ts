import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface NavItem {
  label: string;
  icon: 'phone' | 'portfolio' | 'box' | 'star' | 'chart';
  active?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  readonly items: NavItem[] = [
    { label: 'Llamadas', icon: 'phone', active: true },
    { label: 'Portafolio', icon: 'portfolio' },
    { label: 'Entregas', icon: 'box' },
    { label: 'Seguimiento', icon: 'star' },
    { label: 'Reportes', icon: 'chart' },
  ];
}
