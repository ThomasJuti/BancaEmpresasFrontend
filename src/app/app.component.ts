import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="app-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .app-shell {
        display: flex;
        min-height: 100vh;
      }
      .app-main {
        flex: 1;
        min-width: 0;
      }
    `,
  ],
})
export class AppComponent {}
