export interface TranscriptMessage {
  role: string;
  message: string;
}

export interface Call {
  id: string;
  sessionId?: string;
  fonemaCallId?: string;
  agentId: string;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  variables: Record<string, string>;
  status: 'queued' | 'initiated' | 'in_progress' | 'completed' | 'failed';
  recordingUrl?: string;
  detailsUrl?: string;
  transcript?: TranscriptMessage[];
  summary?: string;
  endedReason?: string;
  durationSeconds?: number;
  successEvaluation?: boolean | string;
  structuredData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
