/**
 * Safety net for panel citation chips: persisted analyses (and the occasional
 * LLM slip) carry raw `clave=valor` strings — rewrite them to analyst Spanish
 * before they reach a chip. Already-human citas pass through untouched.
 */

const KEY_LABELS: Record<string, string> = {
  anomaly_score: 'Indicador de anomalía',
  indicador_anomalia: 'Indicador de anomalía',
  ml_probability: 'Probabilidad del modelo',
  probabilidad_modelo: 'Probabilidad del modelo',
  ml_factors: 'Factores del modelo',
  score: 'Score',
  similarity: 'Similitud',
  similitud: 'Similitud',
  dias_desde_inicio_poliza: 'días desde inicio de póliza',
  dias_desde_fin_poliza: 'días desde fin de póliza',
  dias_entre_ocurrencia_reporte: 'días entre ocurrencia y reporte',
};

/** Keys whose label reads naturally after the value: "7 días desde inicio de póliza". */
const VALUE_FIRST_KEYS = new Set([
  'dias_desde_inicio_poliza',
  'dias_desde_fin_poliza',
  'dias_entre_ocurrencia_reporte',
]);

export function formatCita(cita: string): string {
  let text = cita.trim();

  // "clave=valor → explicación humana" → keep only the human explanation
  const arrowParts = text.split('→');
  if (arrowParts.length > 1 && /^[\w.[\]]+\s*=/.test(arrowParts[0].trim())) {
    text = arrowParts.slice(1).join('→').trim();
  }

  // strip technical comparison parentheticals: "(< -0.1)"
  text = text.replace(/\s*\(\s*[<>≤≥][^)]*\)/g, '');

  // "clave=valor" / "clave: valor" / "clave valor" with a known raw key
  const kv = /^([a-z][a-z0-9_]*)\s*[=:\s]\s*(.+)$/.exec(text);
  if (kv) {
    const key = kv[1];
    const label = KEY_LABELS[key];
    if (label) {
      const value = humanValue(kv[2]);
      text = VALUE_FIRST_KEYS.has(key) ? `${value} ${label}` : `${label}: ${value}`;
    } else if (key.includes('_')) {
      text = `${key.replace(/_/g, ' ')} ${humanValue(kv[2])}`;
    }
  }

  // bare raw values and runaway float precision anywhere in the chip
  text = text.replace(/\bfactores SHAP\b/gi, 'factores del modelo');
  text = text.replace(/=\s*(null|none|\[\]|\{\})/gi, ': no disponible');
  text = text.replace(/-?\d+\.\d{3,}/g, (n) => Number(n).toFixed(2));

  return capitalize(text);
}

function humanValue(raw: string): string {
  const value = raw.trim();
  if (/^(null|none|undefined)$/i.test(value)) return 'no disponible';
  if (value === '[]' || value === '{}') return 'sin datos';
  return value;
}

function capitalize(text: string): string {
  // leave rule codes / IDs (FS-07, RF-03, SIN-0348, P-0042…) untouched
  if (!text || /^[A-Z]{1,4}-\d/.test(text)) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
