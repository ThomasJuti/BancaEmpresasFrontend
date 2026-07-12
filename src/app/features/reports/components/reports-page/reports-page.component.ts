import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FollowUpCase, FollowUpFase, FollowUpService } from '../../../../core/services/follow-up.service';
import { CallDetail, SalesCallsService } from '../../../../core/services/sales-calls.service';
import {
  clientInterested,
  identityVerified,
  isCallTerminal,
  noInterestReason,
} from '../../../../shared/utils/call-display.util';

interface DistributionRow {
  label: string;
  count: number;
  percent: number;
}

/**
 * Vista lateral "Reportes": consolida los resultados de las llamadas de ventas
 * y del seguimiento de activación para dar estadísticas del funnel.
 */
@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.css'],
})
export class ReportsPageComponent implements OnInit {
  private readonly salesCalls = inject(SalesCallsService);
  private readonly followUp = inject(FollowUpService);

  readonly calls = signal<CallDetail[]>([]);
  readonly followUpCases = signal<FollowUpCase[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** KPIs de resultado de las llamadas de ventas. */
  readonly callStats = computed(() => {
    const calls = this.calls();
    const completed = calls.filter((c) => c.status === 'completed');
    const failed = calls.filter((c) => c.status === 'failed');
    const interested = completed.filter((c) => clientInterested(c) === true);
    const notInterested = completed.filter((c) => clientInterested(c) === false);
    const verified = completed.filter((c) => identityVerified(c) === true);
    const withDuration = calls.filter((c) => (c.durationSeconds ?? 0) > 0);
    const totalDuration = withDuration.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0);

    return {
      total: calls.length,
      completed: completed.length,
      failed: failed.length,
      inProgress: calls.filter((c) => !isCallTerminal(c)).length,
      interested: interested.length,
      notInterested: notInterested.length,
      interestRate: this.percent(interested.length, interested.length + notInterested.length),
      verified: verified.length,
      verificationRate: this.percent(verified.length, completed.length),
      avgDurationSeconds: withDuration.length
        ? Math.round(totalDuration / withDuration.length)
        : 0,
    };
  });

  /** Distribución de llamadas por estado, para las barras del reporte. */
  readonly statusDistribution = computed<DistributionRow[]>(() => {
    const calls = this.calls();
    const groups: { label: string; matches: (c: CallDetail) => boolean }[] = [
      { label: 'Completadas', matches: (c) => c.status === 'completed' },
      { label: 'Fallidas', matches: (c) => c.status === 'failed' },
      { label: 'En curso o en cola', matches: (c) => !isCallTerminal(c) },
    ];
    return groups
      .map(({ label, matches }) => {
        const count = calls.filter(matches).length;
        return { label, count, percent: this.percent(count, calls.length) };
      })
      .filter((row) => row.count > 0);
  });

  /** Motivos de no interés más frecuentes, ordenados de mayor a menor. */
  readonly noInterestReasons = computed<DistributionRow[]>(() => {
    const counts = new Map<string, number>();
    for (const call of this.calls()) {
      const reason = noInterestReason(call);
      if (reason) {
        counts.set(reason, (counts.get(reason) ?? 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count, percent: this.percent(count, total) }))
      .sort((a, b) => b.count - a.count);
  });

  /** KPIs del seguimiento de activación de tarjetas entregadas. */
  readonly followUpStats = computed(() => {
    const cases = this.followUpCases();
    return {
      total: cases.length,
      atRisk: cases.filter((c) => c.riesgoInactivacion || c.fase === 'mes_3').length,
      reminders: cases.reduce((sum, c) => sum + c.reminderCount, 0),
      congratulated: cases.filter((c) => c.congratulatedAt != null).length,
    };
  });

  /** Distribución de los casos de seguimiento por fase de uso. */
  readonly faseDistribution = computed<DistributionRow[]>(() => {
    const cases = this.followUpCases();
    const labels: Record<FollowUpFase, string> = {
      al_dia: 'Al día',
      mes_1: 'Mes 1 sin uso',
      mes_2: 'Mes 2 sin uso',
      mes_3: 'Riesgo de inactivación',
    };
    return (Object.keys(labels) as FollowUpFase[]).map((fase) => {
      const count = cases.filter((c) => c.fase === fase).length;
      return { label: labels[fase], count, percent: this.percent(count, cases.length) };
    });
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      calls: this.salesCalls.listCalls(),
      followUp: this.followUp.listCases(),
    }).subscribe({
      next: ({ calls, followUp }) => {
        this.calls.set(calls);
        this.followUpCases.set(followUp.casos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los reportes. ¿El backend está corriendo?');
        this.loading.set(false);
      },
    });
  }

  formatDuration(seconds: number): string {
    if (seconds <= 0) return '—';
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  }

  private percent(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }
}
