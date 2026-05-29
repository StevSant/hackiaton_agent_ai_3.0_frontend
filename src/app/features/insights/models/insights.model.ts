export type HotspotRisk = 'high' | 'medium';

/** Geographic fraud hotspot — coordinates are WGS84 (EPSG:4326), same as Leaflet. */
export interface MapHotspot {
  id: string;
  city: string;
  province: string;
  risk: HotspotRisk;
  latitude: number;
  longitude: number;
  fraudProbability: number;
}

export type AnomalySeverity = 'critical' | 'potential';

export interface AiAnomaly {
  id: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  confidence: number;
}

export interface RegionalFraudPoint {
  region: string;
  value: number;
  color: string;
}

export interface ClaimTypeSlice {
  key: string;
  label: string;
  pct: number;
  count: number;
  color: string;
}

/** Ecuador mainland — tight crop (excludes Galápagos & most neighbor labels). */
export const ECUADOR_MAINLAND_BOUNDS = {
  southWest: { latitude: -4.85, longitude: -80.75 },
  northEast: { latitude: 1.35, longitude: -75.4 },
} as const;

/** @deprecated Use ECUADOR_MAINLAND_BOUNDS for the insights map viewport. */
export const ECUADOR_GEO_BOUNDS = ECUADOR_MAINLAND_BOUNDS;

export const ECUADOR_MAP_CENTER = {
  latitude: -1.65,
  longitude: -78.55,
} as const;

export const ECUADOR_DEFAULT_ZOOM = 8;
