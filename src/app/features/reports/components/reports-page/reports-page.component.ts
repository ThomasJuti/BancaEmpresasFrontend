import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CallDetail, SalesCallsService } from '../../../../core/services/sales-calls.service';
import {
  clientInterested,
  endedReasonLabel,
  identityVerified,
  isCallQualifiedForPipeline,
  isManualCall,
  noInterestReason,
} from '../../../../shared/utils/call-display.util';

interface RankedReason {
  label: string;
  count: number;
  percent: number;
}

interface CallReports {
  total: number;
  completed: number;
  inFlight: number;
  failed: number;
  qualified: number;
  interested: number;
  notInterested: number;
  automated: number;
  manual: number;
  topNoInterest: RankedReason[];
  topEndedReasons: RankedReason[];
}

/**
 * Reportes: estadísticas agregadas sobre el histórico de llamadas (ventas +
 * seguimiento + registro manual). Presentación pura: los datos vienen de
 * SalesCallsService (core) y el formateo de shared/utils/call-display.util.
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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly calls = signal<CallDetail[]>([]);

  readonly reports = computed<CallReports>(() => buildReports(this.calls()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.salesCalls.listCalls().subscribe({
      next: (calls) => {
        this.calls.set(calls);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las llamadas para el reporte.');
        this.loading.set(false);
      },
    });
  }

  /** Porcentaje sobre el total de completadas exitosamente contactadas. */
  qualifiedRate(r: CallReports): number {
    return r.completed === 0 ? 0 : Math.round((r.qualified / r.completed) * 100);
  }
}

function rank(counter: Map<string, number>, total: number): RankedReason[] {
  return [...counter.entries()]
    .map(([label, count]) => ({ label, count, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildReports(calls: CallDetail[]): CallReports {
  let completed = 0;
  let inFlight = 0;
  let failed = 0;
  let qualified = 0;
  let interested = 0;
  let notInterested = 0;
  let automated = 0;
  let manual = 0;

  const noInterestCounter = new Map<string, number>();
  const endedReasonCounter = new Map<string, number>();

  for (const call of calls) {
    if (isManualCall(call)) {
      manual += 1;
    } else {
      automated += 1;
    }

    if (call.status === 'completed') completed += 1;
    else if (call.status === 'failed') failed += 1;
    else inFlight += 1;

    if (isCallQualifiedForPipeline(call)) qualified += 1;

    const interes = clientInterested(call);
    if (interes === true) interested += 1;
    else if (interes === false) notInterested += 1;

    if (interes === false || identityVerified(call) === false) {
      const reason = noInterestReason(call) ?? 'Sin motivo registrado';
      noInterestCounter.set(reason, (noInterestCounter.get(reason) ?? 0) + 1);
    }

    if (call.endedReason?.trim()) {
      const label = endedReasonLabel(call.endedReason);
      endedReasonCounter.set(label, (endedReasonCounter.get(label) ?? 0) + 1);
    }
  }

  const noInterestTotal = [...noInterestCounter.values()].reduce((a, b) => a + b, 0);
  const endedTotal = [...endedReasonCounter.values()].reduce((a, b) => a + b, 0);

  return {
    total: calls.length,
    completed,
    inFlight,
    failed,
    qualified,
    interested,
    notInterested,
    automated,
    manual,
    topNoInterest: rank(noInterestCounter, noInterestTotal),
    topEndedReasons: rank(endedReasonCounter, endedTotal),
  };
}
