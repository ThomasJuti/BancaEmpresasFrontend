import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FollowUpCase,
  FollowUpFase,
  FollowUpService,
} from '../../../../core/services/follow-up.service';
import { CallDetail, SalesCallsService } from '../../../../core/services/sales-calls.service';
import {
  callStatusLabel,
  endedReasonLabel,
  isCallTerminal,
} from '../../../../shared/utils/call-display.util';
import { matchesNit } from '../../../../shared/utils/nit.util';

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
  private readonly salesCalls = inject(SalesCallsService);

  readonly cases = signal<FollowUpCase[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly usageLoadingId = signal<string | null>(null);
  readonly checkingReminders = signal(false);

  // Llamadas del cliente cuyo panel está desplegado (una a la vez).
  readonly expandedClienteId = signal<string | null>(null);
  readonly clientCalls = signal<CallDetail[]>([]);
  readonly clientCallsLoading = signal(false);

  readonly statusLabel = callStatusLabel;
  readonly endedReasonLabel = endedReasonLabel;
  readonly isTerminal = isCallTerminal;

  readonly kpis = computed(() => {
    const casos = this.cases();
    return {
      total: casos.length,
      enRiesgo: casos.filter((c) => c.riesgoInactivacion || c.fase === 'mes_3').length,
      recordatorios: casos.reduce((sum, c) => sum + c.reminderCount, 0),
    };
  });

  ngOnInit(): void {
    this.loadCases();
  }

  /**
   * Botón "Actualizar": solo recarga los casos (días sin uso, fase, etc. se
   * calculan en el backend a partir de la hora actual). Sin efectos
   * secundarios — no dispara llamadas.
   */
  refresh(): void {
    this.loadCases();
  }

  /**
   * Botón "Verificar y lanzar llamadas": procesa los recordatorios por
   * inactividad vencidos (en prod el cron solo corre 1 vez/día) y recarga la
   * lista al terminar. Separado de "Actualizar" para que refrescar la vista
   * nunca dispare llamadas reales de forma implícita.
   */
  checkReminders(): void {
    this.checkingReminders.set(true);
    this.followUpService.processReminders().subscribe({
      next: (response) => {
        this.checkingReminders.set(false);
        const iniciadas = response.resumen.llamadasIniciadas;
        this.showFeedback(
          iniciadas > 0
            ? `${iniciadas} llamada(s) de recordatorio iniciada(s).`
            : 'No hay recordatorios pendientes por ahora.',
        );
        this.loadCases();
      },
      error: () => {
        this.checkingReminders.set(false);
        this.showFeedback('No se pudo verificar los recordatorios.');
      },
    });
  }

  private loadCases(): void {
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
        this.loadCases();
      },
      error: () => {
        this.usageLoadingId.set(null);
        this.showFeedback('No se pudo registrar el uso.');
      },
    });
  }

  /** Despliega/oculta el historial de llamadas del cliente seleccionado. */
  toggleCalls(caso: FollowUpCase): void {
    if (this.expandedClienteId() === caso.clienteId) {
      this.expandedClienteId.set(null);
      return;
    }

    this.expandedClienteId.set(caso.clienteId);
    this.clientCalls.set([]);
    this.clientCallsLoading.set(true);
    this.salesCalls.listCalls().subscribe({
      next: (calls) => {
        this.clientCalls.set(
          calls
            .filter((c) => matchesNit(c.variables?.['nit'], caso.clienteId))
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
        );
        this.clientCallsLoading.set(false);
      },
      error: () => {
        this.clientCallsLoading.set(false);
        this.showFeedback('No se pudieron cargar las llamadas del cliente.');
      },
    });
  }

  isExpanded(caso: FollowUpCase): boolean {
    return this.expandedClienteId() === caso.clienteId;
  }

  /** Etiqueta del tipo de llamada de seguimiento a partir de las variables de entrada. */
  tipoLlamadaLabel(call: CallDetail): string {
    const tipo = call.variables?.['tipo_llamada'];
    if (tipo === 'felicitacion') return 'Felicitación';
    if (tipo === 'recordatorio_uso') return 'Recordatorio de uso';
    return 'Contacto';
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
