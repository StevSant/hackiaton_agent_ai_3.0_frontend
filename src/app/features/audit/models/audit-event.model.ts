export type AuditActor = 'analista' | 'agente' | 'sistema';
export type AuditAction =
  | 'apertura'
  | 'escalamiento'
  | 'consulta_ia'
  | 'cambio_regla'
  | 'cierre'
  | 'export';

export interface AuditEvent {
  id: string;
  ts: string;
  actor: AuditActor;
  actorName: string;
  action: AuditAction;
  title: string;
  detail: string;
  target?: string;
}
