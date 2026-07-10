export interface TranscriptMessage {
  role: string;
  message: string;
}

export interface Call {
  id: string;
  sessionId?: string;
  fonemaCallId?: string;
  /** Caso del pipeline (pipeline_cases.id) al que pertenece esta llamada. */
  caseId?: string;
  agentId: string;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  /** Variables de ENTRADA enviadas al agente al iniciar. */
  variables: Record<string, string>;
  /** Variables de SALIDA que Fonema devuelve tras la conversación
   * (cliente_interesado, identidad_verificada, motivo_no_interes, etc.). */
  outputVariables?: Record<string, string>;
  status: 'queued' | 'initiated' | 'in_progress' | 'completed' | 'failed';
  recordingUrl?: string;
  detailsUrl?: string;
  transcript?: TranscriptMessage[];
  summary?: string;
  endedReason?: string;
  startedAt?: string;
  durationSeconds?: number;
  successEvaluation?: boolean | string;
  structuredData?: Record<string, unknown>;
  totalAttempts?: number;
  createdAt: string;
  updatedAt: string;
}
