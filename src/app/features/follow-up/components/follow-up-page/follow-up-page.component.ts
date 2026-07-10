import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FollowUpCase,
  FollowUpFase,
  FollowUpService,
} from '../../../../core/services/follow-up.service';

/**
 * Vista lateral "Seguimiento": monitoreo de uso de las TC entregadas.
 * La TC se inactiva a los 90 días sin uso; el backend llama automáticamente
 * (mes 1: una llamada al día 30; mes 2: cada 15 días; mes 3: semanal).
 */
@Component({
  selector: 'app-follow-up-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './follow-up-page.component.html',
  styleUrls: ['./follow-up-page.component.css'],
})
export class FollowUpPageComponent implements OnInit {
  private readonly followUpService = inject(FollowUpService);

  readonly cases = signal<FollowUpCase[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly usageLoadingId = signal<string | null>(null);

  readonly kpis = computed(() => {
    const casos = this.cases();
    return {
      total: casos.length,
      enRiesgo: casos.filter((c) => c.riesgoInactivacion || c.fase === 'mes_3').length,
      recordatorios: casos.reduce((sum, c) => sum + c.reminderCount, 0),
    };
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.followUpService.listCases().subscribe({
      next: (response) => {
        this.cases.set(response.casos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el seguimiento. ¿El backend está corriendo?');
        this.loading.set(false);
      },
    });
  }

  registerUsage(caso: FollowUpCase): void {
    this.usageLoadingId.set(caso.clienteId);
    this.followUpService.registerUsage(caso.clienteId).subscribe({
      next: () => {
        this.usageLoadingId.set(null);
        this.showFeedback(`Uso registrado para ${caso.clienteNombre ?? caso.clienteId}. Ciclo de recordatorios reiniciado.`);
        this.refresh();
      },
      error: () => {
        this.usageLoadingId.set(null);
        this.showFeedback('No se pudo registrar el uso.');
      },
    });
  }

  faseLabel(fase: FollowUpFase): string {
    const labels: Record<FollowUpFase, string> = {
      al_dia: 'Al día',
      mes_1: 'Mes 1 sin uso',
      mes_2: 'Mes 2 sin uso',
      mes_3: 'Inactivación',
    };
    return labels[fase];
  }

  faseBadge(caso: FollowUpCase): string {
    if (caso.fase === 'al_dia') return 'activated';
    if (caso.fase === 'mes_3' || caso.riesgoInactivacion) return 'at_risk';
    return 'pending';
  }

  /** Avance hacia la inactivación (día 90), para la barra de progreso. */
  inactivationPercent(caso: FollowUpCase): number {
    return Math.min(100, Math.round((caso.diasSinUso / 90) * 100));
  }

  private showFeedback(message: string): void {
    this.feedback.set(message);
    setTimeout(() => this.feedback.set(null), 3500);
  }
}
