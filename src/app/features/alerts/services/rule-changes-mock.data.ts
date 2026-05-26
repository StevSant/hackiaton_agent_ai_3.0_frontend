import type { RuleChange } from '../models/rule-change.model';

export const MOCK_RULE_CHANGES: RuleChange[] = [
  { id: 'rc_010', ts: '2026-05-26 10:32', actor: 'Motor de reglas', ruleCode: 'FS-13', ruleName: 'Narrativas similares (NLP)', kind: 'umbral', summary: 'Recalibración automática del umbral de similitud.', before: '0.82', after: '0.85' },
  { id: 'rc_009', ts: '2026-05-25 17:02', actor: 'Lucía Vélez', ruleCode: 'FS-14', ruleName: 'Monto cerca de suma asegurada', kind: 'pausada', summary: 'Marcada como observada — generaba muchos falsos positivos en pólizas pequeñas.' },
  { id: 'rc_008', ts: '2026-05-24 09:15', actor: 'Lucía Vélez', ruleCode: 'RF-06', ruleName: 'Demora atípica en denuncia', kind: 'editada', summary: 'Cambió el umbral mínimo de demora aceptable.', before: '> 4 días', after: '> 3 días' },
  { id: 'rc_007', ts: '2026-05-22 14:48', actor: 'Pablo Reyes', ruleCode: 'FS-07', ruleName: 'Beneficiario / proveedor recurrente', kind: 'editada', summary: 'Aumentó el peso máximo de la regla.', before: '8 pts', after: '10 pts' },
  { id: 'rc_006', ts: '2026-05-20 11:22', actor: 'Pablo Reyes', ruleCode: 'RF-07', ruleName: 'Narrativa similar (>85%)', kind: 'reactivada', summary: 'Reactivada después del ajuste del modelo de embeddings.' },
  { id: 'rc_005', ts: '2026-05-18 16:04', actor: 'Lucía Vélez', ruleCode: 'FS-11', ruleName: 'Documentos inconsistentes', kind: 'editada', summary: 'Reclasificada como crítica por incidente de mayo.', before: 'amarillo', after: 'rojo' },
  { id: 'rc_004', ts: '2026-05-15 08:30', actor: 'Sistema', ruleCode: 'RF-03', ruleName: 'Coincidencia con lista restrictiva', kind: 'umbral', summary: 'Lista restrictiva sincronizada con nueva fuente APS.', before: '1240 entradas', after: '1316 entradas' },
  { id: 'rc_003', ts: '2026-05-12 13:18', actor: 'Pablo Reyes', ruleCode: 'FS-12', ruleName: 'Reporte tardío', kind: 'creada', summary: 'Regla nueva derivada del patrón observado en bandeja de abril.' },
  { id: 'rc_002', ts: '2026-05-09 17:55', actor: 'Lucía Vélez', ruleCode: 'AF-05', ruleName: 'Sin tercero identificado', kind: 'pausada', summary: 'Pausada temporalmente mientras se validan datos del módulo de testigos.' },
  { id: 'rc_001', ts: '2026-05-05 09:00', actor: 'Sistema', ruleCode: 'RF-01..RF-04', ruleName: 'Reglas críticas iniciales', kind: 'creada', summary: 'Importación inicial del catálogo desde la especificación del reto.' },
];
