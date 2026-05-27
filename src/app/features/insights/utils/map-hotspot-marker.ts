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
