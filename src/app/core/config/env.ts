export const environment = {
  production: false,
  backendUrl: 'http://localhost:8000',
  apiPrefix: '/api/v1',
  /**
   * Seeded demo personas. Email + password MUST mirror the backend's
   * AUTH_SEED_USERS entries in .env so the demo persona buttons on /login
   * exercise the real auth flow (no mock tokens, no client-side persona fakery).
   * These are not real secrets — they are the hackathon's demo accounts.
   */
  demoCredentials: {
    analista: { email: 'analista@demo.com', password: 'secure123' },
    antifraude: { email: 'antifraude@demo.com', password: 'secure123' },
  },
} as const;
