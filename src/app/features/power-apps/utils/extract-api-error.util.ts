interface ApiErrorBody {
  error?: string | { code?: string; message?: string };
  detail?: string;
  message?: string;
  issues?: Array<{ message?: string }>;
}

function parseNestedMessage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }
  try {
    const parsed = JSON.parse(trimmed) as { detail?: string; message?: string; error?: string };
    return parsed.detail ?? parsed.message ?? parsed.error ?? trimmed;
  } catch {
    return trimmed;
  }
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { error?: ApiErrorBody | string })?.error;
  if (!body) {
    return fallback;
  }

  if (typeof body === 'string') {
    return parseNestedMessage(body);
  }

  if (Array.isArray(body.issues) && body.issues[0]?.message) {
    return body.issues[0].message;
  }

  const nested = body.error;
  if (typeof nested === 'string') {
    return parseNestedMessage(nested);
  }
  if (nested && typeof nested === 'object' && typeof nested.message === 'string') {
    return parseNestedMessage(nested.message);
  }

  if (typeof body.detail === 'string') {
    return parseNestedMessage(body.detail);
  }
  if (typeof body.message === 'string') {
    return parseNestedMessage(body.message);
  }

  return fallback;
}

const MOCK_MISSING_HINT =
  'No hay datos de prueba para este NIT. Desactive RUES_MOCK_ENABLED o consulte un NIT con mock local (ej. 901183139).';

export function humanizeRuesError(message: string): string {
  if (message.includes('JSON mock en salidas')) {
    return MOCK_MISSING_HINT;
  }
  return message;
}
