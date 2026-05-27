import * as L from 'leaflet';

import { ECUADOR_MAINLAND_BOUNDS } from '../models/insights.model';

/** Límite de pan — territorio continental completo. */
export function ecuadorPanBounds(): L.LatLngBounds {
  return L.latLngBounds(
    [ECUADOR_MAINLAND_BOUNDS.southWest.latitude, ECUADOR_MAINLAND_BOUNDS.southWest.longitude],
    [ECUADOR_MAINLAND_BOUNDS.northEast.latitude, ECUADOR_MAINLAND_BOUNDS.northEast.longitude],
  );
}

/** Encuadre inicial — Ecuador continental completo, centrado con margen mínimo. */
export function ecuadorViewportBounds(): L.LatLngBounds {
  const { southWest, northEast } = ECUADOR_MAINLAND_BOUNDS;
  const latitudeMargin = 0.06;
  const longitudeMargin = 0.06;

  return L.latLngBounds(
    [southWest.latitude - latitudeMargin, southWest.longitude - longitudeMargin],
    [northEast.latitude + latitudeMargin, northEast.longitude + longitudeMargin],
  );
}

/** Padding mínimo para overlays (chip, leyenda, controles). */
export const ECUADOR_MAP_FIT_PADDING = {
  topLeft: L.point(8, 28),
  bottomRight: L.point(8, 32),
} as const;
