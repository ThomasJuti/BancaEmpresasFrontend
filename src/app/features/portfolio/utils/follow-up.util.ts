import { FollowUpSchedule } from '../models/portfolio-company.model';

const MS_PER_DAY = 86_400_000;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysSince(isoDate: string, reference = new Date()): number {
  const start = new Date(isoDate);
  return Math.floor((reference.getTime() - start.getTime()) / MS_PER_DAY);
}

export function computeFollowUpSchedule(
  cardShippedAt: string | undefined,
  activatedAt: string | undefined,
  activationStatus: string,
  reference = new Date(),
): FollowUpSchedule {
  if (activationStatus === 'cancelled') {
    return {
      phase: 'cancelled',
      label: 'Tarjeta cancelada',
      cadence: 'Sin gestión activa',
      nextAction: 'Proceso cerrado por inactividad (90 días)',
      daysSinceShipment: cardShippedAt ? daysSince(cardShippedAt, reference) : 0,
      isCancellationRisk: false,
    };
  }

  if (activatedAt) {
    return {
      phase: 'activated',
      label: 'Tarjeta activada',
      cadence: 'Seguimiento a primer consumo',
      nextAction: 'Monitorear primer consumo',
      daysSinceShipment: cardShippedAt ? daysSince(cardShippedAt, reference) : 0,
      isCancellationRisk: false,
    };
  }

  if (!cardShippedAt) {
    return {
      phase: 'not_shipped',
      label: 'Tarjeta aún no enviada',
      cadence: 'Sin reglas de seguimiento activas',
      nextAction: 'Completar etapas previas de entrega',
      daysSinceShipment: 0,
      isCancellationRisk: false,
    };
  }

  const elapsed = daysSince(cardShippedAt, reference);
  const shipped = new Date(cardShippedAt);

  if (elapsed < 30) {
    return {
      phase: 'month_1',
      label: 'Mes 1 — ventana inicial',
      cadence: 'Sin recordatorios automáticos aún',
      nextAction: 'Al cumplir 30 días: correo + llamada de agente',
      nextActionDate: addDays(shipped, 30).toISOString(),
      daysSinceShipment: elapsed,
      isCancellationRisk: false,
    };
  }

  if (elapsed < 60) {
    return {
      phase: 'month_1',
      label: 'Mes 1 — activación pendiente',
      cadence: 'Correo + llamada de agente',
      nextAction: 'Enviar correo y programar llamada de seguimiento',
      nextActionDate: reference.toISOString(),
      daysSinceShipment: elapsed,
      isCancellationRisk: false,
    };
  }

  if (elapsed < 90) {
    const nextReminder = addDays(reference, 15 - (elapsed % 15));
    return {
      phase: 'month_2',
      label: 'Mes 2 — recordatorios quincenales',
      cadence: 'Cada 15 días',
      nextAction: 'Enviar recordatorio de activación',
      nextActionDate: nextReminder.toISOString(),
      daysSinceShipment: elapsed,
      isCancellationRisk: elapsed >= 75,
    };
  }

  if (elapsed < 90) {
    // unreachable but kept for clarity
  }

  const nextWeekly = addDays(reference, 7 - (elapsed % 7));
  return {
    phase: 'month_3',
    label: 'Mes 3 — recordatorios semanales',
    cadence: 'Semanal hasta activación o cancelación',
    nextAction:
      elapsed >= 90
        ? 'Cancelar tarjeta por inactividad (90 días)'
        : 'Enviar recordatorio semanal de activación',
    nextActionDate: elapsed >= 90 ? reference.toISOString() : nextWeekly.toISOString(),
    daysSinceShipment: elapsed,
    isCancellationRisk: true,
  };
}

export function activationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    activated: 'Activada',
    at_risk: 'En riesgo',
    cancelled: 'Cancelada',
  };
  return labels[status] ?? status;
}

export function stepStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En curso',
    completed: 'Completado',
    blocked: 'Bloqueado',
  };
  return labels[status] ?? status;
}
