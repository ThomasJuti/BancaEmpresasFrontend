
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
