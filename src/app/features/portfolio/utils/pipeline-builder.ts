import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  PipelineAction,
  PipelineStage,
  PipelineStageId,
  PipelineSubStep,
  StepStatus,
} from '../models/pipeline-stage.model';
import {
  CompanyPipeline,
  PortfolioCompanySummary,
} from '../models/portfolio-company.model';
import { canOpenPowerApp } from './pipeline-access.util';

// Construcción del pipeline HITL de colocación (etapas, sub-pasos y acciones).
// Compartido por HttpPortfolioRepository para evitar duplicar la definición del proceso.

export function stageActions(stageId: PipelineStageId): PipelineAction[] {
  const actions: Record<PipelineStageId, PipelineAction[]> = {
    calls: [],
    power_app: [
      { id: 'fill_power_app', label: 'Diligenciar solicitud', kind: 'primary' },
      { id: 'view_power_app_result', label: 'Ver solicitud enviada', kind: 'secondary' },
      { id: 'mark_form_complete', label: 'Marcar formulario completo', kind: 'secondary', requiresConfirmation: true, confirmationMessage: '¿Confirmar que el formulario de realce fue diligenciado?' },
    ],
    operations: [
      { id: 'view_ops_status', label: 'Ver estado operaciones', kind: 'secondary' },
      { id: 'resend_goptc', label: 'Simular reenvío', kind: 'primary', requiresConfirmation: true, confirmationMessage: '¿Simular reenvío del archivo a GOPTC?' },
    ],
    card_delivery: [
      { id: 'confirm_delivery', label: 'Confirmar entrega', kind: 'primary', requiresConfirmation: true, confirmationMessage: '¿Confirmar que la tarjeta fue entregada al destinatario?' },
      { id: 'upload_receipt', label: 'Subir acuse (mock)', kind: 'secondary' },
    ],
    follow_up: [
      { id: 'finalize_delivery', label: 'Marcar entrega finalizada', kind: 'primary', requiresConfirmation: true, confirmationMessage: '¿Confirmar que la entrega de la tarjeta al cliente quedó finalizada? La primera vez se llamará al cliente para felicitarlo y arrancará el seguimiento de uso.' },
    ],
  };
  return actions[stageId];
}

export function defaultSubSteps(stageId: PipelineStageId, stageStatus: StepStatus): PipelineSubStep[] {
  const templates: Record<PipelineStageId, PipelineSubStep[]> = {
    calls: [
      { id: 'contact', title: 'Contacto inicial', description: 'Llamada outbound al representante de la empresa.', status: 'pending', assignee: 'Call Center' },
      { id: 'benefits', title: 'Presentación beneficios', description: 'Explicación de beneficios LATAM Business y cupo aprobado.', status: 'pending', assignee: 'Call Center' },
      { id: 'acceptance', title: 'Aceptación oferta', description: 'Cliente acepta avanzar con emisión de tarjeta.', status: 'pending', assignee: 'Call Center' },
      { id: 'recording', title: 'Grabación asociada', description: 'Grabación de la venta disponible para auditoría.', status: 'pending', assignee: 'Sistema' },
    ],
    power_app: [
      { id: 'form_start', title: 'Formulario realce iniciado', description: 'Apertura del formulario Power App post-venta.', status: 'pending', assignee: 'Asesor comercial' },
      { id: 'cardholder_data', title: 'Datos tarjetahabiente', description: 'Captura de datos del representante designado (PN).', status: 'pending', assignee: 'Asesor comercial' },
      { id: 'scheduling', title: 'Agendamiento entrega', description: 'Programación de entrega (3 días hábiles Bogotá).', status: 'pending', assignee: 'Asesor comercial' },
    ],
    operations: [
      { id: 'goptc_send', title: 'Envío a GOPTC', description: 'Archivo MFT de realce y agendamiento enviado.', status: 'pending', assignee: 'Operaciones TC' },
      { id: 'capture', title: 'Captura/realce', description: 'ANS 5 días hábiles para captura en GOPTC.', status: 'pending', assignee: 'GOPTC' },
      { id: 'logistics', title: 'Despacho operador logístico', description: 'Courier o comercial asignado realiza despacho.', status: 'pending', assignee: 'Logística' },
    ],
    card_delivery: [
      { id: 'manufacturing', title: 'Tarjeta fabricada', description: 'Fabricación del plástico (~7 días hábiles).', status: 'pending', assignee: 'GOPTC' },
      { id: 'delivery', title: 'Entrega', description: 'Entrega certificada al tarjetahabiente o tercero.', status: 'pending', assignee: 'Courier / Comercial' },
      { id: 'receipt', title: 'Acuse de recibido firmado', description: 'Acuse con firma, nombre, fecha y cédula.', status: 'pending', assignee: 'Destinatario' },
    ],
    follow_up: [
      { id: 'delivery_finalized', title: 'Entrega de la TC finalizada', description: 'Check único de cierre: al marcarlo se felicita al cliente por su nueva tarjeta y arranca el monitoreo de uso en la vista Seguimiento.', status: 'pending', assignee: 'Gerente de relaciones' },
    ],
  };

  const steps = templates[stageId].map((s) => ({ ...s }));
  if (stageStatus === 'completed') {
    return steps.map((s) => ({ ...s, status: 'completed' as StepStatus, completedAt: '2026-06-01T10:00:00.000Z' }));
  }
  if (stageStatus === 'in_progress') {
    if (stageId === 'calls') {
      return steps.map((s, i) => ({
        ...s,
        status: (i === 0 ? 'in_progress' : 'pending') as StepStatus,
      }));
    }
    return steps.map((s, i) => ({
      ...s,
      status: (i === 0 ? 'completed' : i === 1 ? 'in_progress' : 'pending') as StepStatus,
      ...(i === 0 ? { completedAt: '2026-06-15T10:00:00.000Z' } : {}),
    }));
  }
  return steps;
}

export function buildStages(
  currentStageId: PipelineStageId,
  overrides: Partial<Record<PipelineStageId, Partial<PipelineStage>>> = {},
): PipelineStage[] {
  const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStageId);

  return PIPELINE_STAGE_ORDER.map((id, index) => {
    let status: StepStatus = 'blocked';
    if (index < currentIndex) {
      status = 'completed';
    } else if (index === currentIndex) {
      status = 'in_progress';
    }

    const base: PipelineStage = {
      id,
      order: index + 1,
      title: PIPELINE_STAGE_LABELS[id],
      status,
      subSteps: defaultSubSteps(id, status),
      actions: stageActions(id),
    };

    return { ...base, ...overrides[id] };
  });
}

export function computeProgress(currentStageId: PipelineStageId): number {
  const index = PIPELINE_STAGE_ORDER.indexOf(currentStageId);
  return Math.round(((index + 0.5) / PIPELINE_STAGE_ORDER.length) * 100);
}

export function resolveStageActions(stage: PipelineStage, pipeline: CompanyPipeline): PipelineAction[] {
  if (stage.id === 'power_app' && pipeline.powerAppSubmittedAt) {
    return stage.actions.filter((action) => action.id === 'view_power_app_result');
  }

  if (stage.id === 'power_app') {
    if (!canOpenPowerApp(pipeline)) {
      return [];
    }
    return stage.actions.filter(
      (action) => action.id !== 'view_power_app_result' && action.id !== 'mark_form_complete',
    );
  }

  return stage.actions;
}

export function summaryFromPipeline(pipeline: CompanyPipeline): PortfolioCompanySummary {
  const { stages, ...summary } = pipeline;
  void stages;
  return summary;
}

/** Aplica una acción del pipeline sobre la empresa (muta el objeto) y devuelve el mensaje de feedback. */
export function applyPipelineAction(
  pipeline: CompanyPipeline,
  stageId: PipelineStageId,
  actionId: string,
): string {
  const stage = pipeline.stages.find((s) => s.id === stageId);
  if (!stage) {
    return 'Etapa no encontrada';
  }

  switch (actionId) {
    case 'retry_contact':
      stage.subSteps[0].status = 'in_progress';
      return 'Nuevo intento de contacto registrado.';
    case 'mark_form_complete':
    case 'power_app_approved':
      stage.subSteps.forEach((s) => {
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
      });
      pipeline.powerAppSubmittedAt = pipeline.powerAppSubmittedAt ?? new Date().toISOString();
      advanceStage(pipeline, 'power_app');
      return actionId === 'power_app_approved'
        ? 'Solicitud aprobada. Operaciones puede iniciar realce.'
        : 'Formulario Power App marcado como completo.';
    case 'fill_power_app':
      return 'Abrir formulario de solicitud.';
    case 'view_power_app_result':
      return 'Consultar solicitud enviada.';
    case 'resend_goptc':
      return 'Reenvío a GOPTC simulado correctamente.';
    case 'view_ops_status':
      return 'Estado operaciones: en captura (ANS día 3 de 5).';
    case 'confirm_delivery':
      if (!pipeline.cardShippedAt) {
        pipeline.cardShippedAt = new Date().toISOString();
      }
      stage.subSteps[2].status = 'in_progress';
      return 'Entrega confirmada. Pendiente acuse de recibido.';
    case 'upload_receipt':
      stage.subSteps[2].status = 'completed';
      stage.subSteps[2].completedAt = new Date().toISOString();
      stage.status = 'completed';
      advanceStage(pipeline, 'card_delivery');
      return 'Acuse de recibido cargado (mock).';
    case 'finalize_delivery':
      // El POST real lo hace la página (FollowUpService); aquí solo se refleja el check.
      stage.subSteps.forEach((s) => {
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
      });
      stage.status = 'completed';
      return 'Entrega de la TC finalizada.';
    case 'view_call':
      return 'Abrir historial de contacto telefónico.';
    default:
      return 'Acción ejecutada correctamente (mock).';
  }
}

/** Estado real de la llamada de un cliente, para reflejarlo en los checks. */
export interface CallStateInput {
  status: 'queued' | 'initiated' | 'in_progress' | 'completed' | 'failed';
  hasRecording: boolean;
  qualified: boolean;
  identityVerified?: boolean | null;
  clientInterested?: boolean | null;
  isManual?: boolean;
  at?: string;
  callId?: string;
}

function setSubStep(stage: PipelineStage, id: string, status: StepStatus, at?: string): void {
  const sub = stage.subSteps.find((s) => s.id === id);
  if (!sub) {
    return;
  }
  sub.status = status;
  if (status === 'completed' && at) {
    sub.completedAt = at;
  }
}

/**
 * Refleja el estado real de la llamada de venta en el stage `calls` (checks de
 * proceso). Solo el contacto inicial queda activo hasta que la llamada termine;
 * los checks de beneficios/aceptación dependen de las respuestas; la grabación
 * se habilita recién cuando el contacto quedó procesado (completado o fallido).
 */
export function applyCallState(pipeline: CompanyPipeline, call: CallStateInput | undefined): void {
  const stage = pipeline.stages.find((s) => s.id === 'calls');
  if (!stage || !call) {
    return;
  }
  const at = call.at;

  if (call.callId) {
    stage.linkedCallId = call.callId;
  }

  switch (call.status) {
    case 'queued':
    case 'initiated':
    case 'in_progress':
      setSubStep(stage, 'contact', 'in_progress');
      setSubStep(stage, 'benefits', 'pending');
      setSubStep(stage, 'acceptance', 'pending');
      setSubStep(stage, 'recording', 'pending');
      break;
    case 'failed':
    case 'completed':
      setSubStep(stage, 'contact', 'completed', at);

      if (call.identityVerified === true) {
        setSubStep(stage, 'benefits', 'completed', at);
      } else {
        setSubStep(stage, 'benefits', 'pending');
      }

      if (call.clientInterested === true) {
        setSubStep(stage, 'acceptance', 'completed', at);
      } else {
        setSubStep(stage, 'acceptance', 'pending');
      }

      setSubStep(
        stage,
        'recording',
        call.hasRecording || call.isManual ? 'completed' : 'in_progress',
        call.hasRecording || call.isManual ? at : undefined,
      );

      if (call.qualified) {
        stage.subSteps.forEach((step) => {
          step.status = 'completed';
          if (at) {
            step.completedAt = at;
          }
        });
        stage.status = 'completed';
      }
      break;
  }
}

export function advanceStage(pipeline: CompanyPipeline, completedStageId: PipelineStageId): void {
  const completed = pipeline.stages.find((s) => s.id === completedStageId);
  if (completed) {
    completed.status = 'completed';
    completed.subSteps.forEach((s) => {
      s.status = 'completed';
      if (!s.completedAt) {
        s.completedAt = new Date().toISOString();
      }
    });
  }

  const nextIndex = PIPELINE_STAGE_ORDER.indexOf(completedStageId) + 1;
  if (nextIndex < PIPELINE_STAGE_ORDER.length) {
    const nextId = PIPELINE_STAGE_ORDER[nextIndex];
    pipeline.currentStageId = nextId;
    pipeline.currentStageLabel = PIPELINE_STAGE_LABELS[nextId];
    pipeline.progressPercent = computeProgress(nextId);
    const nextStage = pipeline.stages.find((s) => s.id === nextId);
    if (nextStage) {
      nextStage.status = 'in_progress';
    }
  }
}
