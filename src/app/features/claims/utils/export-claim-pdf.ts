import type { Claim } from '../models';

/**
 * Renders a printable HTML view of the claim and triggers the browser's print
 * dialog. The user picks "Save as PDF" from the browser dialog — no server
 * roundtrip and no extra dependency. Uses a Blob URL + hidden iframe to keep
 * the print sandboxed without resorting to document.write.
 *
 * Why: the demo runs in a browser; native print-to-PDF is enough to satisfy
 * the §2.3 "exportar tray" deliverable without bringing in jsPDF/pdfmake.
 */
export function exportClaimPdf(claim: Claim): void {
  if (typeof window === 'undefined') return;
  const html = renderPrintableClaim(claim);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.setAttribute('aria-hidden', 'true');
  frame.src = url;
  frame.addEventListener('load', () => {
    // Defer to let the iframe finish layout — Chrome occasionally prints blank
    // when print() is called synchronously inside the load event.
    setTimeout(() => {
      const w = frame.contentWindow;
      if (w) {
        w.focus();
        w.print();
      }
      // Allow the print dialog to keep the iframe alive long enough to render.
      setTimeout(() => {
        URL.revokeObjectURL(url);
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 1500);
    }, 100);
  });
  document.body.appendChild(frame);
}

function renderPrintableClaim(c: Claim): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n);
  const tierLabel = { verde: 'Bajo', amarillo: 'Medio', rojo: 'Alto' }[c.nivel];
  const tierColor = { verde: '#16a34a', amarillo: '#ca8a04', rojo: '#dc2626' }[c.nivel];

  const alerts = (c.alertas ?? [])
    .map(
      (a) => `
      <tr>
        <td><code>${escapeHtml(a.code)}</code></td>
        <td>${escapeHtml(a.detalle)}</td>
        <td style="text-align:right">${a.puntos}</td>
        <td>${escapeHtml(a.severidad)}</td>
      </tr>`,
    )
    .join('');

  const documents = (c.documentos ?? [])
    .map(
      (d) => `
      <tr>
        <td>${escapeHtml(d.tipo)}</td>
        <td>${escapeHtml(d.estado)}</td>
        <td>${d.falta ? 'Falta' : 'OK'}</td>
      </tr>`,
    )
    .join('');

  const factors = (c.ml_factors ?? [])
    .map(
      (f) => `
      <li>
        <strong>${escapeHtml(f.feature)}</strong>
        — ${f.direction === 'up' ? '↑ aumenta riesgo' : '↓ reduce riesgo'}
        (SHAP ${f.shap_value.toFixed(3)})
      </li>`,
    )
    .join('');

  const similar = (c.similar ?? [])
    .map(
      (s) => `
      <li>
        <code>${escapeHtml(s.claim_id)}</code> · similitud
        ${(s.similarity * 100).toFixed(1)}%<br/>
        <span style="color:#475569">${escapeHtml(s.snippet)}</span>
      </li>`,
    )
    .join('');

  const reviewStatus = c.review.status.replace(/_/g, ' ');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Centinela IA — ${escapeHtml(c.id)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 32px 40px; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      h2 { font-size: 14px; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
      p, td, th, li { font-size: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      code { font-family: 'JetBrains Mono', ui-monospace, monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
      .tier { display: inline-block; padding: 2px 10px; border-radius: 999px; color: #fff; font-weight: 600; font-size: 11px; background: ${tierColor}; }
      .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; margin-top: 12px; }
      .meta div { font-size: 12px; color: #334155; }
      .meta strong { color: #0f172a; }
      .narrative { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
      footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; }
      @media print { body { padding: 16mm; } }
    </style>
  </head>
  <body>
    <header>
      <p style="color:#64748b;margin:0;font-size:11px;">Centinela IA · Reporte de siniestro</p>
      <h1>${escapeHtml(c.cobertura)}</h1>
      <p style="margin:0;color:#475569;">${escapeHtml(c.id)} · ${escapeHtml(c.ramo)} · ${escapeHtml(c.ciudad)}</p>
      <p style="margin-top:8px;"><span class="tier">${tierLabel} · Score ${c.score}/100</span></p>
    </header>

    <h2>Datos del caso</h2>
    <div class="meta">
      <div><strong>Asegurado:</strong> ${escapeHtml(c.asegurado)} (${escapeHtml(c.asegurado_id)})</div>
      <div><strong>Póliza:</strong> ${escapeHtml(c.poliza)}</div>
      <div><strong>Fecha ocurrencia:</strong> ${escapeHtml(c.fecha_ocurrencia)}</div>
      <div><strong>Fecha reporte:</strong> ${escapeHtml(c.fecha_reporte)}</div>
      <div><strong>Monto reclamado:</strong> ${fmt(c.monto_reclamado)}</div>
      <div><strong>Suma asegurada:</strong> ${fmt(c.suma_asegurada)}</div>
      <div><strong>Estado:</strong> ${escapeHtml(c.estado)}</div>
      <div><strong>Sucursal:</strong> ${escapeHtml(c.sucursal)}</div>
      <div><strong>Workflow:</strong> ${escapeHtml(reviewStatus)}</div>
      ${c.proveedor ? `<div><strong>Proveedor:</strong> ${escapeHtml(c.proveedor)}</div>` : ''}
    </div>

    <h2>Relato</h2>
    <div class="narrative">${escapeHtml(c.descripcion)}</div>

    ${
      alerts
        ? `<h2>Reglas activadas (${(c.alertas ?? []).length})</h2>
           <table>
             <thead><tr><th>Código</th><th>Detalle</th><th style="text-align:right">Puntos</th><th>Severidad</th></tr></thead>
             <tbody>${alerts}</tbody>
           </table>`
        : '<h2>Reglas activadas</h2><p style="color:#64748b">Sin reglas activadas.</p>'
    }

    ${
      factors
        ? `<h2>Factores del modelo (SHAP top-${(c.ml_factors ?? []).length})</h2>
           <ul style="padding-left:18px;margin:0;">${factors}</ul>`
        : ''
    }

    ${
      c.anomaly_score != null
        ? `<h2>Indicador de anomalía</h2>
           <p>Anomaly score: <strong>${c.anomaly_score.toFixed(3)}</strong>
              ${c.nearest_normal_claim_id ? `· caso normal más cercano: <code>${escapeHtml(c.nearest_normal_claim_id)}</code>` : ''}</p>`
        : ''
    }

    ${
      similar
        ? `<h2>Narrativas similares (${(c.similar ?? []).length})</h2>
           <ul style="padding-left:18px;margin:0;">${similar}</ul>`
        : ''
    }

    ${
      documents
        ? `<h2>Documentos</h2>
           <table>
             <thead><tr><th>Tipo</th><th>Estado</th><th>Disponibilidad</th></tr></thead>
             <tbody>${documents}</tbody>
           </table>`
        : ''
    }

    <footer>
      Generado por Centinela IA · ${new Date().toLocaleString('es-EC')} ·
      Este reporte es una alerta para revisión humana. No constituye una acusación
      ni una decisión automática.
    </footer>
  </body>
</html>`;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
