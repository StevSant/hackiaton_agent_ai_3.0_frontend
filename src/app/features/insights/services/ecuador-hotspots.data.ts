import type { MapHotspot } from '../models';

/**
 * WGS84 coordinates for major Ecuadorian cities referenced in the Insights mock.
 * Sources: INEC / OpenStreetMap node positions (rounded to ~4 decimal places).
 */
export const ECUADOR_FRAUD_HOTSPOTS: MapHotspot[] = [
  {
    id: 'quito',
    city: 'Quito',
    province: 'Pichincha',
    risk: 'high',
    latitude: -0.2202,
    longitude: -78.5123,
    fraudProbability: 88,
  },
  {
    id: 'guayaquil',
    city: 'Guayaquil',
    province: 'Guayas',
    risk: 'medium',
    latitude: -2.171,
    longitude: -79.9224,
    fraudProbability: 64,
  },
  {
    id: 'santo-domingo',
    city: 'Santo Domingo',
    province: 'Santo Domingo de los Tsáchilas',
    risk: 'medium',
    latitude: -0.2522,
    longitude: -79.1754,
    fraudProbability: 71,
  },
  {
    id: 'cuenca',
    city: 'Cuenca',
    province: 'Azuay',
    risk: 'medium',
    latitude: -2.9001,
    longitude: -79.0059,
    fraudProbability: 58,
  },
  {
    id: 'manta',
    city: 'Manta',
    province: 'Manabí',
    risk: 'medium',
    latitude: -0.9677,
    longitude: -80.7089,
    fraudProbability: 52,
  },
];
