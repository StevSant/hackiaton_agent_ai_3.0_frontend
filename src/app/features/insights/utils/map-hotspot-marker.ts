import type { MapHotspot } from '../models';

const HIGH_RISK_COLOR = '#ef4444';
const MEDIUM_RISK_COLOR = '#f59e0b';

export function buildHotspotMarkerHtml(hotspot: MapHotspot): string {
  const isHighRisk = hotspot.risk === 'high';
  const riskColor = isHighRisk ? HIGH_RISK_COLOR : MEDIUM_RISK_COLOR;
  const pulseSize = isHighRisk ? 64 : 48;
  const dotSize = isHighRisk ? 16 : 12;
  const pulseClass = isHighRisk ? 'insights-hotspot-ping' : 'insights-hotspot-pulse';

  return `
    <div class="insights-hotspot-marker" role="img" aria-label="${hotspot.city}, ${hotspot.province}">
      <span
        class="insights-hotspot-pulse-ring ${pulseClass}"
        style="width:${pulseSize}px;height:${pulseSize}px;background:${riskColor}55;"
      ></span>
      <span
        class="insights-hotspot-dot"
        style="width:${dotSize}px;height:${dotSize}px;background:${riskColor};box-shadow:0 0 0 3px rgba(255,255,255,0.95), 0 2px 8px rgba(15,23,42,0.35);"
      ></span>
    </div>
  `;
}

export function buildHotspotPopupHtml(hotspot: MapHotspot): string {
  const riskLabel = hotspot.risk === 'high' ? 'Alto' : 'Medio';
  return `
    <div class="insights-hotspot-popup">
      <strong>${hotspot.city}</strong>
      <span class="insights-hotspot-popup-province">${hotspot.province}</span>
      <span class="insights-hotspot-popup-metric">${hotspot.fraudProbability}% prob. fraude · ${riskLabel}</span>
    </div>
  `;
}

const INCIDENT_TIER_HEX: Record<'rojo' | 'amarillo' | 'verde', string> = {
  rojo: '#ef4444',
  amarillo: '#f59e0b',
  verde: '#22c55e',
};

export function incidentTierHex(tier: 'rojo' | 'amarillo' | 'verde'): string {
  return INCIDENT_TIER_HEX[tier];
}

/** Static map pin for a selected incident — no animation, high contrast on the basemap. */
export function buildSelectedIncidentPinHtml(
  tier: 'rojo' | 'amarillo' | 'verde',
  incidentId: string,
): string {
  const fill = incidentTierHex(tier);

  return `
    <div class="insights-incident-pin" role="img" aria-label="Caso seleccionado ${incidentId}">
      <svg viewBox="0 0 28 40" width="28" height="40" aria-hidden="true">
        <path
          d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z"
          fill="${fill}"
          stroke="#ffffff"
          stroke-width="2"
        />
        <circle cx="14" cy="14" r="5" fill="#ffffff" />
      </svg>
    </div>
  `;
}
