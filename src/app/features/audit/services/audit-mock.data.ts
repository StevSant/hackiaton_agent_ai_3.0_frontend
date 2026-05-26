import type { AuditEvent } from '../models';

export const MOCK_AUDIT: AuditEvent[] = [
  { id: 'ev_001', ts: '2026-05-26 14:42', actor: 'analista', actorName: 'Lucía Vélez', action: 'escalamiento', title: 'Escaló SIN-2026-08412 a Unidad Antifraude', detail: 'Score 91/100 · 5 señales activadas (RF-01, RF-03, RF-06, RF-05, AF-02).', target: 'SIN-2026-08412' },
  { id: 'ev_002', ts: '2026-05-26 14:38', actor: 'agente', actorName: 'Centinela IA', action: 'consulta_ia', title: 'Respondió "¿Por qué este caso es alto riesgo?"', detail: 'Citó SIN-2026-08412 y la regla RF-01. Tiempo de respuesta: 1.4s.', target: 'SIN-2026-08412' },
  { id: 'ev_003', ts: '2026-05-26 14:31', actor: 'analista', actorName: 'Lucía Vélez', action: 'apertura', title: 'Abrió detalle del caso', detail: 'Revisión inicial · 0 acciones tomadas aún.', target: 'SIN-2026-08412' },
  { id: 'ev_004', ts: '2026-05-26 13:55', actor: 'sistema', actorName: 'Ingestor', action: 'apertura', title: 'Nuevo siniestro ingresado', detail: 'SIN-2026-08412 ingresó vía batch nocturno · score calculado: 91.', target: 'SIN-2026-08412' },
  { id: 'ev_005', ts: '2026-05-26 13:42', actor: 'analista', actorName: 'Lucía Vélez', action: 'cierre', title: 'Cerró SIN-2026-08376 sin observación', detail: 'Score 12/100 · documentación completa, sin patrones atípicos.', target: 'SIN-2026-08376' },
  { id: 'ev_006', ts: '2026-05-26 12:18', actor: 'agente', actorName: 'Centinela IA', action: 'consulta_ia', title: 'Respondió "Top 10 siniestros con mayor riesgo"', detail: 'Generó lista priorizada con score y reglas activadas. Tiempo: 2.1s.' },
  { id: 'ev_007', ts: '2026-05-26 11:54', actor: 'analista', actorName: 'Lucía Vélez', action: 'escalamiento', title: 'Escaló SIN-2026-08354 a Unidad Antifraude', detail: 'Robo a 9 días del inicio de vigencia · monto 96% suma asegurada.', target: 'SIN-2026-08354' },
  { id: 'ev_008', ts: '2026-05-26 10:32', actor: 'sistema', actorName: 'Motor de reglas', action: 'cambio_regla', title: 'Recalibración automática de umbral FS-13', detail: 'Umbral subió de 0.82 a 0.85 según retroalimentación de la semana.' },
  { id: 'ev_009', ts: '2026-05-26 10:11', actor: 'analista', actorName: 'Lucía Vélez', action: 'export', title: 'Exportó bandeja a CSV', detail: '14 casos · filtro: tier rojo + amarillo.' },
  { id: 'ev_010', ts: '2026-05-26 09:48', actor: 'agente', actorName: 'Centinela IA', action: 'consulta_ia', title: 'Respondió "¿Qué proveedores concentran alertas?"', detail: 'Identificó PRV-0142 (Auto-Élite) con 9 alertas en 14 casos.', target: 'PRV-0142' },
  { id: 'ev_011', ts: '2026-05-26 09:24', actor: 'analista', actorName: 'Lucía Vélez', action: 'apertura', title: 'Abrió detalle del caso', detail: 'Revisión inicial de caso atípico.', target: 'SIN-2026-08398' },
  { id: 'ev_012', ts: '2026-05-25 17:02', actor: 'sistema', actorName: 'Motor de reglas', action: 'cambio_regla', title: 'Regla FS-14 pausada por la analista', detail: 'FS-14 (monto cerca de suma asegurada) marcada como observada solamente.' },
];
