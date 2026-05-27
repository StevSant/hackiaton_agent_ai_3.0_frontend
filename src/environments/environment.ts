// DEV environment (default). Swapped for environment.prod.ts on `production` builds
// via angular.json `fileReplacements`. Consumed through core/config/env.ts.
export const environment = {
  production: false,
  backendUrl: 'http://localhost:8000',
  apiPrefix: '/api/v1',
  /**
   * Seeded demo personas. Email + password MUST mirror the backend's
   * AUTH_SEED_USERS entries so the demo persona buttons on /login exercise
   * the real auth flow. Not real secrets — hackathon demo accounts.
   */
  demoCredentials: {
    analista: { email: 'analista@demo.com', password: 'Demo.Analista2026' },
    antifraude: { email: 'antifraude@demo.com', password: 'Demo.Antifraude2026' },
  },
} as const;
