/** Rutas públicas (landing + auth) siempre en modo oscuro. */
export function isMarketingPath(pathname: string): boolean {
  const path = pathname.split('?')[0].split('#')[0];
  return path === '' || path === '/' || path === '/landing' || path.startsWith('/auth');
}
