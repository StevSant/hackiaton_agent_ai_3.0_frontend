import * as L from 'leaflet';

import { ECUADOR_MAINLAND_BOUNDS } from '../models/insights.model';

/**
 * Encuadre inicial: Ecuador continental + franja del Pacífico a la izquierda.
 * En pantallas anchas evita la banda gris sin tiles al oeste de la costa.
 */
export function ecuadorViewportBounds(): L.LatLngBounds {
  return L.latLngBounds(
    [-4.8, -83.4],
    [1.3, -75.5],
  );
}

/** Pan permitido — incluye océano costero para rellenar márgenes laterales. */
export function ecuadorPanBounds(): L.LatLngBounds {
  return L.latLngBounds(
    [ECUADOR_MAINLAND_BOUNDS.southWest.latitude - 0.35, -84.2],
    [ECUADOR_MAINLAND_BOUNDS.northEast.latitude + 0.35, ECUADOR_MAINLAND_BOUNDS.northEast.longitude + 0.35],
  );
}

/** Padding simétrico pequeño — solo espacio para los overlays. */
export const ECUADOR_MAP_FIT_PADDING = {
  topLeft: L.point(12, 36),
  bottomRight: L.point(12, 40),
} as const;
