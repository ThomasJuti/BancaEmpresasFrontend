// Etiquetas de estado del portafolio. La lógica de cadencia del seguimiento de
// uso (mes 1/2/3) vive en el backend (activation-follow-up) y se muestra en la
// vista lateral "Seguimiento" (feature follow-up).

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
    blocked: 'Pendiente',
    failed: 'No detectado',
  };
  return labels[status] ?? status;
}
