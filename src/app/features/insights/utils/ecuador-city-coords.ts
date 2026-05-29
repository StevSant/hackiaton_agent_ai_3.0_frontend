/**
 * Lookup table: city name → WGS84 coords + province.
 * Used to resolve backend `sucursal` values into map markers.
 * Coordinates from OpenStreetMap city centers, rounded to ~4 decimal places.
 */

export interface CityCoords {
  latitude: number;
  longitude: number;
  province: string;
}

export const ECUADOR_CITY_COORDS: Readonly<Record<string, CityCoords>> = {
  Quito: { latitude: -0.2202, longitude: -78.5123, province: 'Pichincha' },
  Guayaquil: { latitude: -2.171, longitude: -79.9224, province: 'Guayas' },
  Cuenca: { latitude: -2.9001, longitude: -79.0059, province: 'Azuay' },
  'Santo Domingo': {
    latitude: -0.2522,
    longitude: -79.1754,
    province: 'Santo Domingo de los Tsáchilas',
  },
  Manta: { latitude: -0.9677, longitude: -80.7089, province: 'Manabí' },
  Ambato: { latitude: -1.2528, longitude: -78.6155, province: 'Tungurahua' },
  Portoviejo: { latitude: -1.0541, longitude: -80.4521, province: 'Manabí' },
  Machala: { latitude: -3.2581, longitude: -79.9605, province: 'El Oro' },
  Loja: { latitude: -3.9931, longitude: -79.2042, province: 'Loja' },
  Riobamba: { latitude: -1.6727, longitude: -78.6492, province: 'Chimborazo' },
  Ibarra: { latitude: 0.3601, longitude: -78.1361, province: 'Imbabura' },
  Esmeraldas: { latitude: 0.9683, longitude: -79.6517, province: 'Esmeraldas' },
  Babahoyo: { latitude: -1.8021, longitude: -79.5343, province: 'Los Ríos' },
  Quevedo: { latitude: -1.021, longitude: -79.4632, province: 'Los Ríos' },
  Latacunga: { latitude: -0.9341, longitude: -78.6151, province: 'Cotopaxi' },
  Milagro: { latitude: -2.1349, longitude: -79.5872, province: 'Guayas' },
  Tulcán: { latitude: 0.8167, longitude: -77.7167, province: 'Carchi' },
  'Nueva Loja': { latitude: 0.0863, longitude: -76.8842, province: 'Sucumbíos' },
  Tena: { latitude: -0.9933, longitude: -77.8167, province: 'Napo' },
  Macas: { latitude: -2.3079, longitude: -78.1185, province: 'Morona Santiago' },
  Zamora: { latitude: -4.0712, longitude: -78.9568, province: 'Zamora Chinchipe' },
  Puyo: { latitude: -1.4836, longitude: -77.9854, province: 'Pastaza' },
  Azogues: { latitude: -2.7397, longitude: -78.8467, province: 'Cañar' },
  Guaranda: { latitude: -1.5905, longitude: -79.0017, province: 'Bolívar' },
  'Puerto Baquerizo Moreno': {
    latitude: -0.9019,
    longitude: -89.6064,
    province: 'Galápagos',
  },
  'San Cristóbal': { latitude: -0.9019, longitude: -89.6064, province: 'Galápagos' },
};

/** Map sucursal names (e.g. "Quito Norte") to a known city center key. */
export function normalizeToCity(sucursalOrCity: string): string | null {
  if (!sucursalOrCity) return null;
  if (sucursalOrCity in ECUADOR_CITY_COORDS) return sucursalOrCity;
  for (const city of Object.keys(ECUADOR_CITY_COORDS)) {
    if (sucursalOrCity.includes(city)) return city;
  }
  return null;
}
