import { Component } from '@angular/core';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { CallsPageComponent } from './features/calls/components/calls-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, CallsPageComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="app-main">
        <app-calls-page />
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
