// PROD environment — used on `production` builds (Vercel) via angular.json fileReplacements.
// backendUrl points to the deployed Cloud Run backend (not localhost).
export const environment = {
  production: true,
  backendUrl: 'https://fraudia-backend-lxnymgm7dq-uc.a.run.app',
  apiPrefix: '/api/v1',
  demoCredentials: {
    analista: { email: 'analista@demo.com', password: 'Demo.Analista2026' },
    antifraude: { email: 'antifraude@demo.com', password: 'Demo.Antifraude2026' },
  },
} as const;
