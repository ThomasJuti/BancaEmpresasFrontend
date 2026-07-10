import { CallDetail, CallStatus } from '../../core/services/sales-calls.service';

export const CALL_FIELD_LABELS: Record<string, string> = {
  customerName: 'Contacto',
  customerEmail: 'Correo',
  phoneNumber: 'Teléfono',
  empresa: 'Empresa',
  nit: 'NIT',
  nombre: 'Representante',
  identidad_verificada: 'Identidad verificada',
  identidadVerificada: 'Identidad verificada',
  cliente_interesado: 'Cliente interesado',
  clienteInteresado: 'Cliente interesado',
  motivo_no_interes: 'Motivo de no interés',
  motivo_no_interés: 'Motivo de no interés',
  motivoNoInteres: 'Motivo de no interés',
  canal: 'Canal',
  cupo: 'Cupo',
  segmento: 'Segmento',
};

const ENDED_REASON_LABELS: Record<string, string> = {
  'asesor-manual': 'Registro manual del asesor',
  'customer-ended-call': 'Finalizada por el cliente',
  'assistant-ended-call': 'Finalizada por el sistema',
  'voicemail': 'Buzón de voz',
  'no-answer': 'Sin respuesta',
  'busy': 'Línea ocupada',
  'failed': 'Fallida',
};

const HIDDEN_FIELD_KEYS = new Set([
  'fonemacallid',
  'fonema_call_id',
  'detailsurl',
  'details_url',
  'agentid',
  'agent_id',
  'sessionid',
  'session_id',
  'caseid',
  'case_id',
]);

const HEADLINE_KEYS = new Set([
  'identidad_verificada',
  'identidadverificada',
  'cliente_interesado',
  'clienteinteresado',
  'motivo_no_interes',
  'motivo_no_interés',
  'motivonoInteres',
]);

export function formatCallValue(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';
    const lower = trimmed.toLowerCase();
    if (['true', 'verdadero', 'si', 'sí', 'yes', '1'].includes(lower)) return 'Sí';
    if (['false', 'falso', 'no', '0'].includes(lower)) return 'No';
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatCallValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '—';
    return entries
      .map(([k, v]) => `${callFieldLabel(k)}: ${formatCallValue(v)}`)
      .join(' · ');
  }
  return String(value);
}

export function callFieldLabel(key: string): string {
  const normalized = key.trim();
  if (CALL_FIELD_LABELS[normalized]) {
    return CALL_FIELD_LABELS[normalized];
  }
  const snake = normalized.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (CALL_FIELD_LABELS[snake]) {
    return CALL_FIELD_LABELS[snake];
  }
  return normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function endedReasonLabel(reason?: string | null): string {
  if (!reason?.trim()) return '—';
  const key = reason.trim().toLowerCase();
  return ENDED_REASON_LABELS[key] ?? callFieldLabel(key);
}

export function callStatusLabel(status: CallStatus): string {
  const labels: Record<CallStatus, string> = {
    queued: 'En cola',
    initiated: 'Iniciada',
    in_progress: 'En curso',
    completed: 'Completada',
    failed: 'Fallida',
  };
  return labels[status] ?? status;
}

export function isManualCall(call: Pick<CallDetail, 'agentId' | 'variables'>): boolean {
  return call.agentId === 'asesor-manual' || call.variables?.['canal'] === 'manual';
}

export function callOriginLabel(call: Pick<CallDetail, 'agentId' | 'variables'>): string {
  return isManualCall(call) ? 'Registro del asesor' : 'Automático';
}

export function isCallSuccess(value?: boolean | string): boolean {
  return value === true || value === 'true' || value === 'Verdadero';
}

export function readCallVar(call: CallDetail, keys: string[]): string | undefined {
  const wanted = keys.map((k) => k.toLowerCase());
  const sources: Record<string, unknown>[] = [
    call.outputVariables ?? {},
    call.structuredData ?? {},
  ];
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (wanted.includes(key.toLowerCase()) && value != null && String(value).trim() !== '') {
        return formatCallValue(value);
      }
    }
  }
  return undefined;
}

export function identityVerified(call: CallDetail): boolean | null {
  return truthiness(readCallVar(call, ['identidad_verificada', 'identidadVerificada']));
}

export function clientInterested(call: CallDetail): boolean | null {
  return truthiness(readCallVar(call, ['cliente_interesado', 'clienteInteresado']));
}

export function noInterestReason(call: CallDetail): string | null {
  const value = readCallVar(call, ['motivo_no_interes', 'motivo_no_interés', 'motivoNoInteres']);
  if (!value || value === '—' || value.toLowerCase() === 'no aplica') {
    return null;
  }
  return value;
}

function truthiness(value: string | undefined): boolean | null {
  if (value == null || value === '—') {
    return null;
  }
  const v = value.trim().toLowerCase();
  if (['sí', 'si', 'yes', 'true', 'verdadero', '1'].includes(v)) return true;
  if (['no', 'false', 'falso', '0'].includes(v)) return false;
  return null;
}

function shouldHideField(key: string): boolean {
  return HIDDEN_FIELD_KEYS.has(key.toLowerCase().replace(/[^a-z0-9_]/g, ''));
}

export function callDataEntries(
  data?: Record<string, unknown>,
  options?: { excludeHeadlines?: boolean },
): { key: string; label: string; value: string }[] {
  if (!data) return [];
  return Object.entries(data)
    .filter(([key]) => {
      if (shouldHideField(key)) return false;
      if (options?.excludeHeadlines && HEADLINE_KEYS.has(key.toLowerCase())) return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: callFieldLabel(key),
      value: formatCallValue(value),
    }));
}

export function callContactTitle(
  call: CallDetail,
  fallbackRepresentative?: string | null,
): string {
  if (isManualCall(call) && call.customerName?.trim()) {
    return call.customerName.trim();
  }
  return (
    fallbackRepresentative?.trim() ||
    call.variables?.['nombre']?.trim() ||
    call.customerName?.trim() ||
    call.variables?.['empresa']?.trim() ||
    'Sin contacto'
  );
}

export function callContactSubtitle(call: CallDetail): string {
  const parts: string[] = [];
  if (call.variables?.['empresa']) {
    parts.push(call.variables['empresa']);
  }
  if (call.variables?.['nit']) {
    parts.push(`NIT ${call.variables['nit']}`);
  }
  if (call.phoneNumber) {
    parts.push(call.phoneNumber);
  }
  return parts.join(' · ') || '—';
}
