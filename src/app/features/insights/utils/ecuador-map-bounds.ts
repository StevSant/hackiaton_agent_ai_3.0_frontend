import * as L from 'leaflet';

import { ECUADOR_MAINLAND_BOUNDS } from '../models/insights.model';

/** Límite de pan — territorio continental completo. */
export function ecuadorPanBounds(): L.LatLngBounds {
  return L.latLngBounds(
    [ECUADOR_MAINLAND_BOUNDS.southWest.latitude, ECUADOR_MAINLAND_BOUNDS.southWest.longitude],
    [ECUADOR_MAINLAND_BOUNDS.northEast.latitude, ECUADOR_MAINLAND_BOUNDS.northEast.longitude],
  );
}

/**
 * Encuadre inicial ajustado a la masa terrestre de Ecuador.
 * - Oeste: -80.1° (costa, excluye océano abierto)
 * - Este: -75.5° (frontera oriental)
 * - Sur: -4.8° (Macará / Zamora)
 * - Norte: 1.3° (San Lorenzo)
 */
export function ecuadorViewportBounds(): L.LatLngBounds {
  return L.latLngBounds(
    [-4.8, -80.1],
    [1.3, -75.5],
  );
}

/** Padding simétrico pequeño — solo espacio para los overlays. */
export const ECUADOR_MAP_FIT_PADDING = {
  topLeft: L.point(12, 36),
  bottomRight: L.point(12, 40),
} as const;
